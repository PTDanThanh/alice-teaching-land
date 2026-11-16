import { isValidMaterialKey } from "@/lib/material-storage";

export type MaterialUploadPhase =
    | "ready"
    | "infected"
    | "failed"
    | "expired"
    | "cleanup"
    | "attached"
    | "promoting"
    | "promotion_pending"
    | "scanning"
    | "scan_pending"
    | "confirming";

export type MaterialUploadStatusRecord = {
    objectKey: string;
    status: "pending" | "confirmed" | "attached";
    scanStatus: "pending" | "scanning" | "clean" | "infected" | "failed";
    promotionStatus: "pending" | "promoting" | "completed" | "failed";
    cleanupStatus: "pending" | "cleaning" | "completed" | "failed";
    expiresAt: Date;
};

export function getMaterialUploadState(
    upload: MaterialUploadStatusRecord,
    now = Date.now()
): {
    phase: MaterialUploadPhase;
    ready: boolean;
    key: string | null;
    expired: boolean;
} {
    const expiresAt = upload.expiresAt.getTime();
    const expired = !Number.isFinite(expiresAt) || expiresAt <= now;
    const verifiedKey =
        upload.objectKey.startsWith("materials/verified/") &&
        isValidMaterialKey(upload.objectKey);
    const ready =
        upload.status === "confirmed" &&
        upload.scanStatus === "clean" &&
        upload.promotionStatus === "completed" &&
        upload.cleanupStatus === "pending" &&
        !expired &&
        verifiedKey;

    let phase: MaterialUploadPhase;

    if (upload.status === "attached") {
        phase = "attached";
    } else if (upload.cleanupStatus !== "pending") {
        phase = "cleanup";
    } else if (upload.scanStatus === "infected") {
        phase = "infected";
    } else if (
        upload.scanStatus === "failed" ||
        upload.promotionStatus === "failed"
    ) {
        phase = "failed";
    } else if (ready) {
        phase = "ready";
    } else if (expired) {
        phase = "expired";
    } else if (upload.promotionStatus === "promoting") {
        phase = "promoting";
    } else if (upload.scanStatus === "clean") {
        phase = "promotion_pending";
    } else if (upload.scanStatus === "scanning") {
        phase = "scanning";
    } else if (upload.status === "confirmed") {
        phase = "scan_pending";
    } else {
        phase = "confirming";
    }

    return {
        phase,
        ready,
        key: ready ? upload.objectKey : null,
        expired,
    };
}
