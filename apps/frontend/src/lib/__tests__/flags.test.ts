import { afterEach, describe, expect, it } from "vitest";

import { showPricing } from "../flags";

describe("showPricing (NEXT_PUBLIC_SHOW_PRICING)", () => {
  const orig = process.env.NEXT_PUBLIC_SHOW_PRICING;
  afterEach(() => {
    if (orig === undefined) delete process.env.NEXT_PUBLIC_SHOW_PRICING;
    else process.env.NEXT_PUBLIC_SHOW_PRICING = orig;
  });

  it("oculto por default (variable ausente)", () => {
    delete process.env.NEXT_PUBLIC_SHOW_PRICING;
    expect(showPricing()).toBe(false);
  });

  it("oculto con 'false'", () => {
    process.env.NEXT_PUBLIC_SHOW_PRICING = "false";
    expect(showPricing()).toBe(false);
  });

  it("visible solo con 'true' exacto", () => {
    process.env.NEXT_PUBLIC_SHOW_PRICING = "true";
    expect(showPricing()).toBe(true);
  });
});
