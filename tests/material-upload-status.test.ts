import assert from "node:assert/strict";
import { test } from "node:test";

import {
    getMaterialUploadState,
    type MaterialUploadStatusRecord,
} from "../lib/material-upload-status";

const verifiedKey =
    "materials/verified/123e4567-e89b-12d3-a456-426614174000.pdf";

function makeUpload(
    overrides: Partial<MaterialUploadStatusRecord> = {}
): MaterialUploadStatusRecord {
    return {
        objectKey: verifiedKey,
        status: "confirmed",
        scanStatus: "clean",
        promotionStatus: "completed",
        cleanupStatus: "pending",
        expiresAt: new Date(10_000),
        ...overrides,
    };
}

test("ready requires a confirmed, clean, promoted, unexpired verified object", () => {
    assert.deepEqual(getMaterialUploadState(makeUpload(), 1), {
        phase: "ready",
        ready: true,
        key: verifiedKey,
        expired: false,
    });
});

test("an attached upload is not reusable as a ready file", () => {
    assert.deepEqual(
        getMaterialUploadState(makeUpload({ status: "attached" }), 1),
        {
            phase: "attached",
            ready: false,
            key: null,
            expired: false,
        }
    );
});

test("a promoted record with a staging key is not ready", () => {
    const state = getMaterialUploadState(
        makeUpload({ objectKey: "materials/staging/123e4567-e89b-12d3-a456-426614174000.pdf" }),
        1
    );

    assert.equal(state.ready, false);
    assert.equal(state.key, null);
});

test("an expired verified upload is not ready", () => {
    const state = getMaterialUploadState(makeUpload(), 10_000);

    assert.equal(state.phase, "expired");
    assert.equal(state.ready, false);
    assert.equal(state.key, null);
});
