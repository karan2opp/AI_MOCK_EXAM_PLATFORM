import { z } from "zod";

export const assignRoleSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["teacher", "student", "admin"]).default("teacher"),
});

export const searchUserSchema = z.object({
  email: z.string().email("Invalid email address"),
});
