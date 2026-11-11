import { describe, expect, it } from "vitest";

import {
  SUPPORT_CATEGORIES_LIST,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_VARIANT,
  actorLabel,
} from "@/lib/support";
import { publicSupportSchema, supportTicketSchema } from "@/lib/validation";

describe("support labels", () => {
  it("cubre todos los estados y categorías del backend", () => {
    expect(SUPPORT_STATUSES.sort()).toEqual(
      ["answered", "fix_proposed", "needs_info", "new", "resolved", "triaged", "wontfix"].sort(),
    );
    expect(SUPPORT_CATEGORIES_LIST.sort()).toEqual(
      ["access", "bug", "other", "question", "suggestion"].sort(),
    );
    for (const s of SUPPORT_STATUSES) {
      expect(SUPPORT_STATUS_LABELS[s]).toBeTruthy();
      expect(SUPPORT_STATUS_VARIANT[s]).toBeTruthy();
    }
    for (const c of SUPPORT_CATEGORIES_LIST) expect(SUPPORT_CATEGORY_LABELS[c]).toBeTruthy();
  });

  it("nombra al autor según quién mira", () => {
    expect(actorLabel("user", "user")).toBe("Vos");
    expect(actorLabel("user", "admin")).toBe("Usuario");
    expect(actorLabel("admin", "user")).toBe("Equipo de HG");
  });
});

describe("support schemas", () => {
  const ok = { subject: "No carga el video", body: "Se queda en negro", category: "bug" as const };

  it("acepta un ticket válido y recorta espacios", () => {
    const r = supportTicketSchema.safeParse({ ...ok, subject: "  No carga el video  " });
    expect(r.success && r.data.subject).toBe("No carga el video");
  });

  it("rechaza asunto/detalle cortos y categorías desconocidas", () => {
    expect(supportTicketSchema.safeParse({ ...ok, subject: "ab" }).success).toBe(false);
    expect(supportTicketSchema.safeParse({ ...ok, body: "hey" }).success).toBe(false);
    expect(supportTicketSchema.safeParse({ ...ok, category: "nope" }).success).toBe(false);
  });

  it("el formulario público exige nombre y email válido", () => {
    const pub = { ...ok, name: "Ana", email: "ana@example.com", category: "access" as const };
    expect(publicSupportSchema.safeParse(pub).success).toBe(true);
    expect(publicSupportSchema.safeParse({ ...pub, email: "no-es-email" }).success).toBe(false);
    expect(publicSupportSchema.safeParse({ ...pub, name: " " }).success).toBe(false);
  });
});
