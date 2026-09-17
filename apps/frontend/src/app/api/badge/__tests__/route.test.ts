import { describe, expect, it } from "vitest";

import { GET } from "../route";

function req(qs: string): Request {
  return new Request(`http://localhost/api/badge?${qs}`);
}

describe("GET /api/badge", () => {
  it("200 + svg content-type + immutable cache for a dimension badge", async () => {
    const res = await GET(req("dimension=CP&level=L2&rank=3&state=earned"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(res.headers.get("Cache-Control")).toBe("public, max-age=31536000, immutable");
    const body = await res.text();
    expect(body.startsWith("<svg")).toBe(true);
    // Self-contained: mosaic must be inlined as a data URI, not a relative path.
    expect(body).toContain("data:image/png;base64,");
  });

  it("200 + svg for a custom-path (multi-pillar) badge", async () => {
    const res = await GET(req("route=Liderazgo&company=Acme&pillars=CP,PR,SA"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/svg+xml");
    const body = await res.text();
    expect(body.startsWith("<svg")).toBe(true);
    expect(body).toContain("ACME");
  });

  it("400 when neither dimension nor route is given", async () => {
    const res = await GET(req(""));
    expect(res.status).toBe(400);
  });

  it("400 for an out-of-range size", async () => {
    const res = await GET(req("dimension=CP&size=9999"));
    expect(res.status).toBe(400);
  });

  it("400 for an empty pillars list on a route badge", async () => {
    const res = await GET(req("route=Liderazgo&company=Acme&pillars="));
    expect(res.status).toBe(400);
  });
});
