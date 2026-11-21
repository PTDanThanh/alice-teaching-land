import assert from "node:assert/strict";
import { test } from "node:test";

import { parseListeningLessonPayload } from "../lib/skills/validation";

const validPayload = {
  title: "Market conversation",
  language: "en",
  youtubeUrl: "https://www.youtube.com/watch?v=abcdefghijk",
  transcript:
    "00:00.000 --> 00:03.500 | Hello everyone.\n00:03.500 --> 00:07.200 | Welcome to our lesson.",
  status: "published",
};

test("listening lesson payload derives a YouTube ID and timestamped segments", () => {
  const result = parseListeningLessonPayload(validPayload);

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.data.videoId, "abcdefghijk");
  assert.equal(result.data.segments.length, 2);
  assert.equal(result.data.segments[1].text, "Welcome to our lesson.");
});

test("listening lesson payload rejects unsupported video URLs", () => {
  const result = parseListeningLessonPayload({
    ...validPayload,
    youtubeUrl: "https://example.com/watch?v=abcdefghijk",
  });

  assert.equal(result.ok, false);
});

test("listening lesson payload rejects overlapping transcript timestamps", () => {
  const result = parseListeningLessonPayload({
    ...validPayload,
    transcript:
      "00:00.000 --> 00:04.000 | First sentence.\n00:03.500 --> 00:07.200 | Second sentence.",
  });

  assert.equal(result.ok, false);
});
