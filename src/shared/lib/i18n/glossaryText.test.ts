import { describe, expect, it } from "vitest";
import { splitGlossaryText } from "./glossaryText";

describe("splitGlossaryText", () => {
  it("marks glossary terms in Kyrgyz sentences", () => {
    const parts = splitGlossaryText(
      "CRM, кампа, касса, аналитика, сатуулар жана кызматкерлер",
    );

    expect(parts).toEqual([
      { type: "text", value: "CRM, " },
      { type: "term", value: "кампа", hint: "склад" },
      { type: "text", value: ", " },
      { type: "term", value: "касса", hint: "касса (куту)" },
      { type: "text", value: ", аналитика, " },
      { type: "term", value: "сатуулар", hint: "продажи" },
      { type: "text", value: " жана " },
      { type: "term", value: "кызматкерлер", hint: "сотрудники" },
    ]);
  });

  it("prefers longer terms over shorter overlaps", () => {
    const parts = splitGlossaryText("кампалык башкаруу");

    expect(parts).toEqual([
      { type: "term", value: "кампалык", hint: "складской" },
      { type: "text", value: " башкаруу" },
    ]);
  });

  it("returns plain text when there are no matches", () => {
    expect(splitGlossaryText("Hello world")).toEqual([
      { type: "text", value: "Hello world" },
    ]);
  });
});
