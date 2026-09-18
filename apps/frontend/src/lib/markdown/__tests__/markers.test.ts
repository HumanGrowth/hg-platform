import { describe, expect, it } from "vitest";

import { extractInlineStat, findCaptionSpans } from "../markers";

const spans = (s: string) => findCaptionSpans(s).map((x) => x.text);

describe("findCaptionSpans (//caption//)", () => {
  it("matches a balanced //caption//", () => {
    expect(spans("Un dato //Fuente: WEF, 2025// y sigue")).toEqual(["Fuente: WEF, 2025"]);
    expect(spans("//solo esto//")).toEqual(["solo esto"]);
    expect(spans("Fin de frase //la nota//.")).toEqual(["la nota"]);
  });

  it("finds several captions", () => {
    expect(spans("//uno// y //dos//")).toEqual(["uno", "dos"]);
  });

  it("never matches inside URLs (scheme :// or path //)", () => {
    expect(spans("Mirá https://example.com/a y https://foo.org/b para más")).toEqual([]);
    expect(spans("ftp://host/x//y//z")).toEqual([]);
    expect(spans("http://a.com//b//c")).toEqual([]);
    expect(spans("www.x.com//a//b")).toEqual([]);
    expect(spans("(https://a.com//x//)")).toEqual([]);
  });

  it("requires balance: an unmatched // is left alone", () => {
    expect(spans("una //nota sin cierre")).toEqual([]);
    expect(spans("cierra sin abrir// y nada")).toEqual([]);
  });

  it("does not match a caption that contains a slash or spans padding", () => {
    expect(spans("//a/b//")).toEqual([]);
    expect(spans("// hola //")).toEqual([]);
    expect(spans("////")).toEqual([]);
  });
});

describe("extractInlineStat ([[stat: V · L]])", () => {
  it("extracts value + label and removes the marker", () => {
    const r = extractInlineStat("Antes [[stat: 47% · de los equipos]] después");
    expect(r?.stat).toEqual({ value: "47%", label: "de los equipos" });
    expect(r?.rest).toBe("Antes  después");
  });

  it("accepts | as separator and returns null without marker", () => {
    expect(extractInlineStat("[[stat: 3x | más rápido]]")?.stat).toEqual({ value: "3x", label: "más rápido" });
    expect(extractInlineStat("[[stat sin formato]] y [[link]]")).toBeNull();
  });
});
