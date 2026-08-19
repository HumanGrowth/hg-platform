import { describe, expect, it } from "vitest";

import { acceptInviteSchema, loginSchema } from "@/lib/validation";

describe("loginSchema", () => {
  it("rechaza email y password vacíos", () => {
    const r = loginSchema.safeParse({ email: "", password: "" });
    expect(r.success).toBe(false);
  });

  it("acepta credenciales completas (incluye dominios .test)", () => {
    const r = loginSchema.safeParse({ email: "admin@acme.test", password: "AdminAcme#2026" });
    expect(r.success).toBe(true);
  });
});

describe("acceptInviteSchema", () => {
  it("rechaza contraseñas de menos de 6 caracteres", () => {
    const r = acceptInviteSchema.safeParse({ usernameOrEmail: "ana", password: "abc1" });
    expect(r.success).toBe(false);
  });

  it("acepta una contraseña de exactamente 6 caracteres (M1)", () => {
    const r = acceptInviteSchema.safeParse({ usernameOrEmail: "ana_diaz", password: "abc123" });
    expect(r.success).toBe(true);
  });

  it("acepta un username válido + contraseña >= 6", () => {
    const r = acceptInviteSchema.safeParse({ usernameOrEmail: "ana_diaz", password: "Brand0New!!" });
    expect(r.success).toBe(true);
  });

  it("acepta un email + contraseña >= 6", () => {
    const r = acceptInviteSchema.safeParse({ usernameOrEmail: "ana@x.io", password: "Brand0New!!" });
    expect(r.success).toBe(true);
  });

  it("rechaza un username inválido (espacios)", () => {
    const r = acceptInviteSchema.safeParse({ usernameOrEmail: "ana diaz!", password: "Brand0New!!" });
    expect(r.success).toBe(false);
  });
});
