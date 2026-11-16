import assert from "node:assert/strict";
import { afterEach, mock, test } from "node:test";
import { Readable } from "node:stream";
import { S3Client } from "@aws-sdk/client-s3";

import type { MaterialMalwareScanResult } from "../lib/material-malware-scanner";
import {
    calculateMaterialChecksum,
} from "../lib/material-file-security";
import { getMaterialSignedUrl } from "../lib/material-storage";
import {
    claimPendingMaterialScanJob,
    loadMaterialScanJobContent,
    recoverExpiredMaterialScanJobs,
    scanClaimedMaterialJob,
} from "../lib/material-scan-job";
import MaterialUpload from "../src/models/materialUpload";

type TestUpload = {
    _id: string;
    uploadId: string;
    objectKey: string;
    ownerId: string;
    originalName: string;
    contentType: string;
    fileSize: number;
    status: "pending" | "confirmed" | "attached";
    scanStatus: "pending" | "scanning" | "clean" | "infected" | "failed";
    scanAttempts?: number;
    workerToken?: string | null;
    leaseExpiresAt?: Date | null;
    scannedAt?: Date | null;
    fileChecksum?: string | null;
    scannerVersion?: string | null;
    createdAt: Date;
};

const fileContent = Buffer.from("%PDF-1.7\nunit test document");
const documents: TestUpload[] = [];
const r2EnvironmentKeys = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET_NAME",
] as const;
const originalR2Environment = new Map(
    r2EnvironmentKeys.map((key) => [key, process.env[key]])
);
let scannedContent = fileContent;
let beforeRecoveryUpdate:
    | ((document: TestUpload) => void)
    | undefined;

function cloneUpload(upload: TestUpload): TestUpload {
    return {
        ...upload,
        ...(upload.leaseExpiresAt instanceof Date
            ? { leaseExpiresAt: new Date(upload.leaseExpiresAt) }
            : {}),
        ...(upload.scannedAt instanceof Date
            ? { scannedAt: new Date(upload.scannedAt) }
            : {}),
        createdAt: new Date(upload.createdAt),
    };
}

function comparable(value: unknown): number | unknown {
    return value instanceof Date ? value.getTime() : value;
}

function matchesField(
    actual: unknown,
    condition: unknown,
    exists: boolean
): boolean {
    if (condition instanceof RegExp) {
        return typeof actual === "string" && condition.test(actual);
    }

    if (
        condition === null ||
        typeof condition !== "object" ||
        condition instanceof Date
    ) {
        return comparable(actual) === comparable(condition);
    }

    const operators = condition as Record<string, unknown>;

    for (const [operator, expected] of Object.entries(operators)) {
        if (operator === "$exists") {
            if (exists !== expected) return false;
        } else if (operator === "$lt") {
            if (!(comparable(actual)! < comparable(expected)!)) return false;
        } else if (operator === "$lte") {
            if (!(comparable(actual)! <= comparable(expected)!)) return false;
        } else if (operator === "$gt") {
            if (!(comparable(actual)! > comparable(expected)!)) return false;
        } else {
            return false;
        }
    }

    return true;
}

function matches(
    upload: TestUpload,
    filter: Record<string, unknown>
): boolean {
    return Object.entries(filter).every(([key, condition]) => {
        if (key === "$or") {
            return (condition as Record<string, unknown>[]).some((item) =>
                matches(upload, item)
            );
        }

        if (key === "$and") {
            return (condition as Record<string, unknown>[]).every((item) =>
                matches(upload, item)
            );
        }

        const exists = Object.prototype.hasOwnProperty.call(upload, key);
        return matchesField(
            upload[key as keyof TestUpload],
            condition,
            exists
        );
    });
}

function applyUpdate(
    upload: TestUpload,
    update: Record<string, Record<string, unknown>>
): void {
    for (const [key, value] of Object.entries(update.$set ?? {})) {
        Object.assign(upload, { [key]: value });
    }

    for (const [key, amount] of Object.entries(update.$inc ?? {})) {
        const previous = upload[key as keyof TestUpload];
        Object.assign(upload, {
            [key]: Number(previous ?? 0) + Number(amount),
        });
    }

    for (const key of Object.keys(update.$unset ?? {})) {
        delete upload[key as keyof TestUpload];
    }
}

function addUpload(
    overrides: Partial<TestUpload> = {}
): TestUpload {
    const upload: TestUpload = {
        _id: "upload-1",
        uploadId: "session-1",
        objectKey: "materials/staging/00000000-0000-0000-0000-000000000001.pdf",
        ownerId: "test-admin",
        originalName: "lesson.pdf",
        contentType: "application/pdf",
        fileSize: fileContent.length,
        status: "confirmed",
        scanStatus: "pending",
        scanAttempts: 0,
        createdAt: new Date(),
        ...overrides,
    };
    documents.push(upload);
    return upload;
}

function installDatabaseMock(): void {
    mock.method(
        MaterialUpload,
        "findOneAndUpdate",
        (filter: object, update: object) =>
            ({
                lean: async () => {
                    const upload = documents.find((item) =>
                        matches(item, filter as Record<string, unknown>)
                    );
                    if (!upload) return null;

                    applyUpdate(
                        upload,
                        update as Record<string, Record<string, unknown>>
                    );
                    return cloneUpload(upload);
                },
            }) as never
    );

    mock.method(
        MaterialUpload,
        "find",
        (filter: object) => {
            let limit = Number.MAX_SAFE_INTEGER;
            let projection = "";

            const query = {
                sort() {
                    return this;
                },
                limit(value: number) {
                    limit = value;
                    return this;
                },
                select(value: string) {
                    projection = value;
                    return this;
                },
                lean: async () => {
                    const rows = documents
                        .filter((item) =>
                            matches(item, filter as Record<string, unknown>)
                        )
                        .slice(0, limit)
                        .map((item) => {
                            const selected: Record<string, unknown> = {};
                            for (const field of projection.split(/\s+/)) {
                                if (field && field in item) {
                                    selected[field] = item[
                                        field as keyof TestUpload
                                    ];
                                }
                            }
                            return selected;
                        });

                    for (const row of rows) {
                        const upload = documents.find(
                            (item) => item._id === row._id
                        );
                        if (upload) beforeRecoveryUpdate?.(upload);
                    }

                    return rows;
                },
            };

            return query as never;
        }
    );

    mock.method(
        MaterialUpload,
        "updateOne",
        async (filter: object, update: object) => {
            const upload = documents.find((item) =>
                matches(item, filter as Record<string, unknown>)
            );
            if (!upload) return { modifiedCount: 0 };

            applyUpdate(
                upload,
                update as Record<string, Record<string, unknown>>
            );
            return { modifiedCount: 1 };
        }
    );
}

function installStorageMock(): void {
    process.env.R2_ACCOUNT_ID = "unit-test-account";
    process.env.R2_ACCESS_KEY_ID = "unit-test-access-key";
    process.env.R2_SECRET_ACCESS_KEY = "unit-test-secret-key";
    process.env.R2_BUCKET_NAME = "unit-test-bucket";

    mock.method(
        S3Client.prototype,
        "send",
        async () =>
            ({
                Body: Readable.from([Buffer.from(scannedContent)]),
                ContentLength: scannedContent.length,
            }) as never
    );
}

function scannerReturning(
    result: MaterialMalwareScanResult
): { scan: (input: { content: Buffer }) => Promise<MaterialMalwareScanResult> } {
    return {
        scan: async ({ content }) => {
            assert.deepEqual(content, scannedContent);
            return result;
        },
    };
}

afterEach(() => {
    mock.restoreAll();
    documents.length = 0;
    scannedContent = fileContent;
    beforeRecoveryUpdate = undefined;

    for (const key of r2EnvironmentKeys) {
        const value = originalR2Environment.get(key);
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
});

test("T01 claim pending confirmed staging job", async () => {
    installDatabaseMock();
    installStorageMock();
    const upload = addUpload();

    const job = await claimPendingMaterialScanJob();

    assert.ok(job);
    assert.equal(upload.scanAttempts, 1);
    assert.equal(upload.scanStatus, "scanning");
    assert.ok(upload.workerToken);
    assert.ok(upload.leaseExpiresAt instanceof Date);
    assert.equal(job.workerToken, upload.workerToken);
});

test("T02 recover expired lease without incrementing attempts", async () => {
    installDatabaseMock();
    installStorageMock();
    const upload = addUpload({
        scanStatus: "scanning",
        scanAttempts: 1,
        workerToken: "worker-old",
        leaseExpiresAt: new Date(Date.now() - 1_000),
    });

    assert.equal(await recoverExpiredMaterialScanJobs(), 1);
    assert.equal(upload.scanStatus, "pending");
    assert.equal(upload.scanAttempts, 1);
    assert.equal("workerToken" in upload, false);
    assert.equal("leaseExpiresAt" in upload, false);
});

test("T03 reclaimed job increments attempts to two", async () => {
    installDatabaseMock();
    installStorageMock();
    const upload = addUpload({
        scanStatus: "scanning",
        scanAttempts: 1,
        workerToken: "worker-old",
        leaseExpiresAt: new Date(Date.now() - 1_000),
    });

    assert.equal(await recoverExpiredMaterialScanJobs(), 1);
    const job = await claimPendingMaterialScanJob();

    assert.ok(job);
    assert.equal(upload.scanAttempts, 2);
    assert.equal(upload.scanStatus, "scanning");
});

test("T04 third expired attempt is failed, not made pending", async () => {
    installDatabaseMock();
    installStorageMock();
    const upload = addUpload({
        scanStatus: "scanning",
        scanAttempts: 3,
        workerToken: "worker-third",
        leaseExpiresAt: new Date(Date.now() - 1_000),
    });

    assert.equal(await recoverExpiredMaterialScanJobs(), 1);
    assert.equal(upload.scanStatus, "failed");
    assert.equal(upload.scanAttempts, 3);
    assert.equal("workerToken" in upload, false);
    assert.equal("leaseExpiresAt" in upload, false);
});

test("T05 job at the attempt limit cannot be claimed again", async () => {
    installDatabaseMock();
    installStorageMock();
    const upload = addUpload({ scanAttempts: 3 });

    assert.equal(await claimPendingMaterialScanJob(), null);
    assert.equal(upload.scanAttempts, 3);
    assert.equal(upload.scanStatus, "pending");
});

test("T06 concurrent claim calls return at most one owner", async () => {
    installDatabaseMock();
    installStorageMock();
    const upload = addUpload();

    // The in-memory conditional update is synchronous; this does not prove MongoDB atomicity.
    const jobs = await Promise.all([
        claimPendingMaterialScanJob(),
        claimPendingMaterialScanJob(),
    ]);

    const claimed = jobs.filter((job) => job !== null);
    assert.equal(claimed.length, 1);
    assert.equal(upload.scanAttempts, 1);
    assert.equal(upload.workerToken, claimed[0].workerToken);
});

test("T07 old worker cannot overwrite the reclaimed worker result", async () => {
    installDatabaseMock();
    installStorageMock();
    const upload = addUpload();
    const workerA = await claimPendingMaterialScanJob();
    assert.ok(workerA);

    let signalScannerStarted!: () => void;
    let finishScan!: (result: MaterialMalwareScanResult) => void;
    const scannerStarted = new Promise<void>((resolve) => {
        signalScannerStarted = resolve;
    });
    const scanResult = new Promise<MaterialMalwareScanResult>((resolve) => {
        finishScan = resolve;
    });

    const scanByA = scanClaimedMaterialJob(
        workerA,
        {
            scan: async ({ content }) => {
                assert.deepEqual(content, scannedContent);
                signalScannerStarted();
                return scanResult;
            },
        }
    );
    await scannerStarted;

    upload.leaseExpiresAt = new Date(Date.now() - 1_000);
    assert.equal(await recoverExpiredMaterialScanJobs(), 1);
    const workerB = await claimPendingMaterialScanJob();
    assert.ok(workerB);

    finishScan({
        status: "clean",
        scannerVersion: "mock-scanner",
        scannedAt: new Date(),
    });
    assert.equal(await scanByA, "stale");
    assert.equal(upload.scanStatus, "scanning");
    assert.equal(upload.workerToken, workerB.workerToken);
});

test("T08 infected result is terminal and remains in staging", async () => {
    installDatabaseMock();
    installStorageMock();
    const upload = addUpload();
    const job = await claimPendingMaterialScanJob();
    assert.ok(job);
    const file = await loadMaterialScanJobContent(job);
    assert.deepEqual(file.content, scannedContent);

    const outcome = await scanClaimedMaterialJob(
        job,
        scannerReturning({
            status: "infected",
            scannerVersion: "mock-scanner",
            scannedAt: new Date(),
            threatName: "Mock-Test-Threat",
        })
    );

    assert.equal(outcome, "infected");
    assert.equal(upload.scanStatus, "infected");
    assert.equal(upload.scanAttempts, 1);
    assert.match(upload.objectKey, /^materials\/staging\//);
    assert.equal(await claimPendingMaterialScanJob(), null);
    await assert.rejects(
        getMaterialSignedUrl(upload.objectKey),
        /MATERIAL_NOT_VERIFIED/
    );
});

test("T09 clean result stores checksum and stays in staging", async () => {
    installDatabaseMock();
    installStorageMock();
    scannedContent = Buffer.from("%PDF-1.7\nclean test");
    const upload = addUpload({
        fileSize: scannedContent.length,
    });
    const job = await claimPendingMaterialScanJob();
    assert.ok(job);

    const outcome = await scanClaimedMaterialJob(
        job,
        scannerReturning({
            status: "clean",
            scannerVersion: "mock-scanner-v1",
            scannedAt: new Date(),
        })
    );

    assert.equal(outcome, "clean");
    assert.equal(upload.scanStatus, "clean");
    assert.equal(upload.fileChecksum, calculateMaterialChecksum(scannedContent));
    assert.ok(upload.scannedAt instanceof Date);
    assert.equal(upload.scannerVersion, "mock-scanner-v1");
    assert.match(upload.objectKey, /^materials\/staging\//);
    await assert.rejects(
        getMaterialSignedUrl(upload.objectKey),
        /MATERIAL_NOT_VERIFIED/
    );
});

test("T10 failed result and scanner exception fail closed without retry", async () => {
    installDatabaseMock();
    installStorageMock();
    const failedResultUpload = addUpload();
    const failedResultJob = await claimPendingMaterialScanJob();
    assert.ok(failedResultJob);

    const failedResultOutcome = await scanClaimedMaterialJob(
        failedResultJob,
        scannerReturning({
            status: "failed",
            errorCode: "MOCK_SCANNER_ERROR",
            errorMessage: "Mock scanner unavailable",
        })
    );

    assert.equal(failedResultOutcome, "failed");
    assert.equal(failedResultUpload.scanStatus, "failed");
    assert.equal(failedResultUpload.scanAttempts, 1);
    assert.equal(await claimPendingMaterialScanJob(), null);

    const exceptionUpload = addUpload({
        _id: "upload-2",
        uploadId: "session-2",
    });
    const exceptionJob = await claimPendingMaterialScanJob();
    assert.ok(exceptionJob);

    const exceptionOutcome = await scanClaimedMaterialJob(
        exceptionJob,
        {
            scan: async () => {
                throw new Error("mock scanner exception");
            },
        }
    );

    assert.equal(exceptionOutcome, "failed");
    assert.equal(exceptionUpload.scanStatus, "failed");
    assert.equal(exceptionUpload.scanAttempts, 1);
    assert.equal(await claimPendingMaterialScanJob(), null);
});

test("T11 legacy upload without scanAttempts can be claimed once", async () => {
    installDatabaseMock();
    installStorageMock();
    const upload = addUpload({ scanAttempts: undefined });
    delete upload.scanAttempts;

    const job = await claimPendingMaterialScanJob();

    assert.ok(job);
    assert.equal(upload.scanAttempts, 1);
    assert.equal(upload.scanStatus, "scanning");
});

test("T12 recovery does not overwrite a changed token or renewed lease", async () => {
    installDatabaseMock();
    installStorageMock();

    for (const race of ["token", "lease"] as const) {
        documents.length = 0;
        const upload = addUpload({
            scanStatus: "scanning",
            scanAttempts: 0,
            workerToken: "worker-original",
            leaseExpiresAt: new Date(Date.now() - 1_000),
        });

        beforeRecoveryUpdate = (current) => {
            if (race === "token") {
                current.workerToken = "worker-reclaimed";
                current.leaseExpiresAt = new Date(Date.now() + 60_000);
            } else {
                current.leaseExpiresAt = new Date(Date.now() + 60_000);
            }
        };

        assert.equal(await recoverExpiredMaterialScanJobs(), 0);
        assert.equal(upload.scanStatus, "scanning");
        assert.equal(upload.leaseExpiresAt!.getTime() > Date.now(), true);
        if (race === "token") {
            assert.equal(upload.workerToken, "worker-reclaimed");
        } else {
            assert.equal(upload.workerToken, "worker-original");
        }
    }
});
