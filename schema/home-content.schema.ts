import { z } from "zod";

// Chỉ cho phép đường dẫn nội bộ, ví dụ /materials.
const internalPathSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập đường dẫn.")
  .max(500, "Đường dẫn quá dài.")
  .refine(
    (value) =>
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !/[\\\s]/.test(value),
    "Đường dẫn phải là đường dẫn nội bộ, ví dụ /materials.",
  );

// Bước đầu dùng ảnh có sẵn trong public.
// Chức năng upload ảnh sẽ bổ sung sau.
const imagePathSchema = z
  .string()
  .trim()
  .min(1, "Vui lòng nhập đường dẫn ảnh.")
  .max(500, "Đường dẫn ảnh quá dài.")
  .refine(
    (value) =>
      value.startsWith("/") &&
      !value.startsWith("//") &&
      !/[\\\s]/.test(value),
    "Nhập đường dẫn ảnh nội bộ, ví dụ /images/hero-alice.png.",
  );

export const heroContentSchema = z
  .object({
    enabled: z.boolean(),

    greeting: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập lời chào.")
      .max(100, "Lời chào không được vượt quá 100 ký tự."),

    tagline: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập dòng giới thiệu.")
      .max(150, "Dòng giới thiệu không được vượt quá 150 ký tự."),

    title: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập tiêu đề.")
      .max(200, "Tiêu đề không được vượt quá 200 ký tự."),

    description: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập mô tả.")
      .max(1000, "Mô tả không được vượt quá 1.000 ký tự."),

    imageUrl: imagePathSchema,

    imageAlt: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập mô tả ảnh.")
      .max(200, "Mô tả ảnh không được vượt quá 200 ký tự."),

    buttonLabel: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập chữ trên nút.")
      .max(60, "Chữ trên nút không được vượt quá 60 ký tự."),

    buttonHref: internalPathSchema,
  })
  .strict();

export type HeroContent = z.infer<typeof heroContentSchema>;