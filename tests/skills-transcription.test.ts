import assert from "node:assert/strict";
import { test } from "node:test";

import {
  convertSrtToDictation,
  normalizeYouTubeUrl,
} from "../lib/skills/transcription";
import { parseTimestampedTranscript } from "../lib/skills/dictation";

test("normalizeYouTubeUrl accepts supported YouTube links and strips tracking data", () => {
  assert.equal(
    normalizeYouTubeUrl(
      "https://www.youtube.com/watch?v=abcdefghijk&feature=share",
    ),
    "https://www.youtube.com/watch?v=abcdefghijk",
  );
  assert.equal(
    normalizeYouTubeUrl("https://youtu.be/abcdefghijk"),
    "https://www.youtube.com/watch?v=abcdefghijk",
  );
});

test("normalizeYouTubeUrl rejects non-YouTube and non-standard authority URLs", () => {
  for (const url of [
    "http://www.youtube.com/watch?v=abcdefghijk",
    "https://youtube.com.evil.example/watch?v=abcdefghijk",
    "https://user@youtube.com/watch?v=abcdefghijk",
    "https://youtube.com:8443/watch?v=abcdefghijk",
  ]) {
    assert.throws(() => normalizeYouTubeUrl(url));
  }
});

test("convertSrtToDictation produces timestamped lines accepted by the editor", () => {
  const transcript = convertSrtToDictation(
    [
      "1",
      "00:00:00,000 --> 00:00:02,450",
      "Bonjour tout le monde.",
      "",
      "2",
      "00:00:02,450 --> 00:00:03,750",
      "Comment allez-vous ?",
    ].join("\n"),
  );

  assert.equal(
    transcript,
    "00:00.000 --> 00:02.450 | Bonjour tout le monde.\n" +
      "00:02.450 --> 00:03.750 | Comment allez-vous ?",
  );
  assert.equal(parseTimestampedTranscript(transcript).errors.length, 0);
});
