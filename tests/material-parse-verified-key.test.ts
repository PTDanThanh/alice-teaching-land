import assert from "node:assert/strict";
import { test } from "node:test";

import { parseMaterial } from "../lib/materials";

const baseMaterial = {
    title: "English upload test",
    description: "",
    collection: "",
    language: "en",
    type: "pdf",
    level: "A1",
    status: "draft",
    showOnHome: false,
};

test("parseMaterial accepts a verified file key of the matching type", () => {
    const verifiedKey =
        "materials/verified/123e4567-e89b-12d3-a456-426614174000.pdf";

    assert.equal(
        parseMaterial({ ...baseMaterial, downloadUrl: verifiedKey })
            ?.downloadUrl,
        verifiedKey
    );
});

test("parseMaterial still rejects staging keys", () => {
    assert.equal(
        parseMaterial({
            ...baseMaterial,
            downloadUrl:
                "materials/staging/123e4567-e89b-12d3-a456-426614174000.pdf",
        }),
        null
    );
});
