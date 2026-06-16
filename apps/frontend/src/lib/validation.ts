import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Ingresá tu email"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const acceptInviteSchema = z.object({
  fullName: z.string().min(1, "Ingresá tu nombre"),
  password: z.string().min(10, "Mínimo 10 caracteres"),
});
export type AcceptInviteValues = z.infer<typeof acceptInviteSchema>;

export const createOrgSchema = z.object({
  name: z.string().min(1, "Nombre requerido"),
  slug: z
    .string()
    .min(1, "Slug requerido")
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  country: z.string().max(2).optional().or(z.literal("")),
  tier: z.enum(["A", "B", "C"]),
  licenses_total: z.coerce.number().int().min(0),
});
export type CreateOrgValues = z.infer<typeof createOrgSchema>;

export const inviteSchema = z.object({
  email: z.string().min(1, "Email requerido").email("Email inválido"),
  role: z.enum(["admin", "manager", "collaborator"]),
});
export type InviteValues = z.infer<typeof inviteSchema>;

export const contactSchema = z.object({
  name: z.string().min(1, "Ingresá tu nombre"),
  email: z.string().min(1, "Ingresá tu email").email("Email inválido"),
  company: z.string().min(1, "Ingresá tu empresa"),
  role: z.enum(["RRHH", "Líder", "IT", "Otro"]).optional().or(z.literal("")),
  message: z.string().max(2000).optional().or(z.literal("")),
});
export type ContactValues = z.infer<typeof contactSchema>;
