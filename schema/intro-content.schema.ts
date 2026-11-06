import { z } from "zod";

const internalImagePathSchema = z
    .string()
    .trim()
    .min(1, "Vui lòng chọn ảnh.")
    .max(500, "Đường dẫn ảnh quá dài.")
    .refine(
        (value) =>
            value.startsWith("/") &&
            !value.startsWith("//") &&
            !/[\\\s]/.test(value),
        "Ảnh phải sử dụng đường dẫn nội bộ, ví dụ /uploads/home/anh.webp.",
    );

export const introImageSchema = z
    .object({
        id: z
            .string()
            .trim()
            .min(1, "Ảnh phải có ID.")
            .max(100, "ID ảnh quá dài."),

        imageUrl: internalImagePathSchema,

        imageAlt: z
            .string()
            .trim()
            .min(1, "Vui lòng nhập mô tả ảnh.")
            .max(200, "Mô tả ảnh không được vượt quá 200 ký tự."),
    })
    .strict();

export const introContentSchema = z
    .object({
        enabled: z.boolean(),

        images: z
            .array(introImageSchema)
            .max(20, "Chỉ được thêm tối đa 20 ảnh."),
    })
    .strict()
    .superRefine((content, context) => {
        if (content.enabled && content.images.length === 0) {
            context.addIssue({
                code: "custom",
                path: ["images"],
                message: "Thêm ít nhất một ảnh trước khi bật dải ảnh.",
            });
        }

        const ids = new Set<string>();

        content.images.forEach((image, index) => {
            if (ids.has(image.id)) {
                context.addIssue({
                    code: "custom",
                    path: ["images", index, "id"],
                    message: "ID ảnh bị trùng.",
                });
            }

            ids.add(image.id);
        });
    });

export type IntroImage = z.infer<typeof introImageSchema>;
export type IntroContent = z.infer<typeof introContentSchema>;