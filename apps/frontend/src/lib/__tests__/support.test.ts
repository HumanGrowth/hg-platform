import { describe, expect, it } from "vitest";

import {
  SUPPORT_CATEGORIES_LIST,
  SUPPORT_CATEGORY_LABELS,
  SUPPORT_MAX_BYTES,
  SUPPORT_MAX_FILES,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  SUPPORT_STATUS_VARIANT,
  actorLabel,
  addSupportFiles,
  formatBytes,
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

const file = (name: string, type: string, size = 10) =>
  new File([new Uint8Array(size)], name, { type });

describe("addSupportFiles", () => {
  it("acepta capturas, PDF y texto", () => {
    const r = addSupportFiles([], [file("a.png", "image/png"), file("b.pdf", "application/pdf"), file("c.log", "")]);
    expect(r.files).toHaveLength(3);
    expect(r.error).toBeNull();
  });

  it("rechaza tipos no permitidos (SVG, ejecutables, HTML) y sigue con el resto", () => {
    const r = addSupportFiles([], [file("x.svg", "image/svg+xml"), file("y.exe", ""), file("ok.png", "image/png")]);
    expect(r.files.map((f) => f.name)).toEqual(["ok.png"]);
    expect(r.error).toBe("type");
  });

  it("rechaza archivos de más de 5 MB", () => {
    const r = addSupportFiles([], [file("big.png", "image/png", SUPPORT_MAX_BYTES + 1)]);
    expect(r.files).toHaveLength(0);
    expect(r.error).toBe("tooLarge");
  });

  it(`no pasa de ${SUPPORT_MAX_FILES} archivos`, () => {
    const four = [1, 2, 3, 4].map((i) => file(`${i}.png`, "image/png"));
    const r = addSupportFiles([], four);
    expect(r.files).toHaveLength(SUPPORT_MAX_FILES);
    expect(r.error).toBe("tooMany");
  });

  it("formatea tamaños", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3 * 1024 * 1024)).toBe("3.0 MB");
  });
});
