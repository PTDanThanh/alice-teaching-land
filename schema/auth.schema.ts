import { z } from "zod";

const withinBcryptLimit = (value: string) =>
  new TextEncoder().encode(value).length <= 72;

const passwordForLogin = z
  .string()
  .min(1, "Mật khẩu không được để trống")
  .refine(withinBcryptLimit, {
    message: "Mật khẩu không được vượt quá 72 byte",
  });

const newPassword = z
  .string()
  .min(8, "Mật khẩu mới phải có ít nhất 8 ký tự")
  .refine(withinBcryptLimit, {
    message: "Mật khẩu mới không được vượt quá 72 byte",
  });

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Email không đúng định dạng")
    .max(254, "Email quá dài"),

  password: passwordForLogin,
});

export const changePasswordSchema = z
  .object({
    oldPassword: passwordForLogin,
    newPassword,
  })
  .refine(
    (data) => data.oldPassword !== data.newPassword,
    {
      message: "Mật khẩu mới phải khác mật khẩu hiện tại",
      path: ["newPassword"],
    },
  );

export type LoginInput = z.infer<typeof loginSchema>;

export type ChangePasswordInput = z.infer<
  typeof changePasswordSchema
>;