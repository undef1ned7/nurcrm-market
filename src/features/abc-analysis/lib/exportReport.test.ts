import { describe, expect, it } from "vitest";
import { csvCell } from "./exportReport";

describe("csvCell", () => {
  it("экранирует формулы апострофом (CSV-инъекция)", () => {
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("+7 999")).toBe("'+7 999");
    expect(csvCell("-Скидка")).toBe("'-Скидка");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell('=HYPERLINK("http://evil","Жми")')).toBe(`"'=HYPERLINK(""http://evil"",""Жми"")"`);
  });

  it("числа остаются числами", () => {
    expect(csvCell(-200)).toBe("-200");
    expect(csvCell("-200,5")).toBe("-200,5");
    expect(csvCell("100")).toBe("100");
  });

  it("«;», кавычки и переносы — в кавычках", () => {
    expect(csvCell('Сок "Добрый"; 1л')).toBe('"Сок ""Добрый""; 1л"');
    expect(csvCell("a\r\nb")).toBe('"a\r\nb"');
    expect(csvCell("Хлеб")).toBe("Хлеб");
  });
});
