import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Ingresá tu email"),
  password: z.string().min(1, "Ingresá tu contraseña"),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Ingresá tu email")
    .regex(/^\S+@\S+\.\S+$/, "Ingresá un email válido"),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Mínimo 6 caracteres"),
    confirm: z.string().min(1, "Repetí la contraseña"),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Las contraseñas no coinciden",
  });
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const acceptInviteSchema = z.object({
  // Release TASK 3.4: un solo campo "usuario o correo" (email invitado o username).
  usernameOrEmail: z
    .string()
    .min(1, "Ingresá tu usuario o nombre")
    .refine(
      (v) => /^\S+@\S+\.\S+$/.test(v) || /^[a-zA-Z0-9._-]{3,30}$/.test(v),
      "Usá tu correo, o un usuario de 3-30 caracteres (letras, números, . _ -).",
    ),
  password: z.string().min(6, "Mínimo 6 caracteres"),
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
  // Nombre opcional: si se completa, se usa en el saludo del email.
  name: z.string().max(255).optional().or(z.literal("")),
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

// ─────────────── Soporte (ADR-0015) ───────────────

export const SUPPORT_CATEGORIES = ["bug", "question", "access", "suggestion", "other"] as const;

export const supportTicketSchema = z.object({
  subject: z.string().trim().min(3, "Contanos el tema en pocas palabras").max(200),
  body: z.string().trim().min(5, "Describí qué pasó o qué necesitás").max(5000),
  category: z.enum(SUPPORT_CATEGORIES),
});
export type SupportTicketValues = z.infer<typeof supportTicketSchema>;

export const publicSupportSchema = supportTicketSchema.extend({
  name: z.string().trim().min(1, "required").max(255),
  email: z.string().trim().min(1, "required").email("invalid"),
});
export type PublicSupportValues = z.infer<typeof publicSupportSchema>;
