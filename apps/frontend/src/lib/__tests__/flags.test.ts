import { afterEach, describe, expect, it } from "vitest";

import { customPathsEnabled, showHumanize, showPricing } from "../flags";

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

describe("customPathsEnabled (NEXT_PUBLIC_CUSTOM_PATHS_ENABLED)", () => {
  const orig = process.env.NEXT_PUBLIC_CUSTOM_PATHS_ENABLED;
  afterEach(() => {
    if (orig === undefined) delete process.env.NEXT_PUBLIC_CUSTOM_PATHS_ENABLED;
    else process.env.NEXT_PUBLIC_CUSTOM_PATHS_ENABLED = orig;
  });

  it("deshabilitada por default", () => {
    delete process.env.NEXT_PUBLIC_CUSTOM_PATHS_ENABLED;
    expect(customPathsEnabled()).toBe(false);
  });

  it("habilitada solo con 'true' exacto", () => {
    process.env.NEXT_PUBLIC_CUSTOM_PATHS_ENABLED = "true";
    expect(customPathsEnabled()).toBe(true);
  });
});

describe("showHumanize (NEXT_PUBLIC_SHOW_HUMANIZE)", () => {
  const orig = process.env.NEXT_PUBLIC_SHOW_HUMANIZE;
  afterEach(() => {
    if (orig === undefined) delete process.env.NEXT_PUBLIC_SHOW_HUMANIZE;
    else process.env.NEXT_PUBLIC_SHOW_HUMANIZE = orig;
  });

  it("apagado por default", () => {
    delete process.env.NEXT_PUBLIC_SHOW_HUMANIZE;
    expect(showHumanize()).toBe(false);
  });

  it("encendido solo con 'true' exacto", () => {
    process.env.NEXT_PUBLIC_SHOW_HUMANIZE = "1";
    expect(showHumanize()).toBe(false);
    process.env.NEXT_PUBLIC_SHOW_HUMANIZE = "true";
    expect(showHumanize()).toBe(true);
  });
});
