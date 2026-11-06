
import "server-only";

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);

// =====================================================
// 1. CẤU HÌNH LIBREOFFICE
// =====================================================

// macOS: sử dụng LibreOffice đã cài trên máy.
// Linux: có thể sử dụng lệnh "soffice" trong PATH.
const LIBREOFFICE_PATH =
  process.env.LIBREOFFICE_PATH ??
  (process.platform === "darwin"
    ? "/Applications/LibreOffice.app/Contents/MacOS/soffice"
    : "soffice");

// Giới hạn thời gian chuyển đổi: 2 phút
const CONVERSION_TIMEOUT = 120_000;

// Giới hạn kích thước file đầu vào và PDF đầu ra
const MAX_FILE_SIZE = 20 * 1024 * 1024;

// =====================================================
// 2. CHUYỂN POWERPOINT THÀNH PDF
// =====================================================

export async function convertPowerPointToPdf(
  input: Buffer,
  extension: ".ppt" | ".pptx"
): Promise<Buffer> {
  // Kiểm tra dữ liệu đầu vào
  if (input.length === 0 || input.length > MAX_FILE_SIZE) {
    throw new Error("Dung lượng PowerPoint không hợp lệ.");
  }

  // Tạo thư mục tạm riêng cho mỗi lần chuyển đổi
  const tempDir = await mkdtemp(
    path.join(tmpdir(), "alice-powerpoint-")
  );

  const inputPath = path.join(tempDir, `source${extension}`);
  const outputPath = path.join(tempDir, "source.pdf");
  const profilePath = path.join(tempDir, "libreoffice-profile");

  try {
    // Ghi file PowerPoint vào thư mục tạm
    await writeFile(inputPath, input);

    // Chạy LibreOffice để xuất PDF
    await execFileAsync(
      LIBREOFFICE_PATH,
      [
        "-env:UserInstallation=" +
          pathToFileURL(profilePath).href,
        "--headless",
        "--convert-to",
        "pdf:impress_pdf_Export",
        "--outdir",
        tempDir,
        inputPath,
      ],
      {
        timeout: CONVERSION_TIMEOUT,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      }
    );

    // Đọc PDF sau khi chuyển đổi
    const pdfBuffer = await readFile(outputPath);

    // Kiểm tra PDF đầu ra
    if (
      pdfBuffer.length === 0 ||
      pdfBuffer.length > MAX_FILE_SIZE ||
      pdfBuffer.subarray(0, 5).toString() !== "%PDF-"
    ) {
      throw new Error("PDF Preview không hợp lệ.");
    }

    return pdfBuffer;
  } finally {
    // Xóa file tạm dù chuyển đổi thành công hay thất bại
    await rm(tempDir, {
      recursive: true,
      force: true,
    });
  }
}
