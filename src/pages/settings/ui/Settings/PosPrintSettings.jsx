import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  printRussianRawUsb,
  setEscposCharsPerLine,
  setEscposCodepage,
  setEscposDotsPerLine,
  setEscposFont,
  setEscposLineHeight,
} from "@pages/sell/ui/services/printService";
import { PageShell, PageHeader, PagePanel } from "@shared/ui/page-shell";
import "./Settings.scss";

const readNumber = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  } catch {
    return fallback;
  }
};
const readString = (key, fallback) => {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
};

export default function PosPrintSettings() {
  const navigate = useNavigate();

  const [dotsPerLine, setDotsPerLine] = useState(576);
  const [charsPerLine, setCharsPerLine] = useState(64);
  const [font, setFont] = useState("B"); // A | B
  const [lineHeight, setLineHeight] = useState(22);
  const [codepage, setCodepage] = useState(17);

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState(null); // {type, text}

  useEffect(() => {
    const f = String(readString("escpos_font", "B")).toUpperCase() === "A" ? "A" : "B";
    const dpl = readNumber("escpos_dpl", 576);
    const charDotWidth = f === "B" ? 9 : 12;
    const cplDefault = Math.floor(dpl / charDotWidth);
    const cpl = readNumber("escpos_cpl", cplDefault);
    const lh = readNumber("escpos_line", f === "B" ? 22 : 24);
    const cp = readNumber("escpos_cp", 17);

    setFont(f);
    setDotsPerLine(dpl);
    setCharsPerLine(cpl);
    setLineHeight(lh);
    setCodepage(cp);
  }, []);

  const presets = useMemo(
    () => [
      { id: "80", label: "80 мм (обычно 576 точек)", dpl: 576 },
      { id: "58", label: "58 мм (обычно 384 точки)", dpl: 384 },
      { id: "44", label: "44 мм (обычно 320 точек)", dpl: 320 },
      { id: "38", label: "38 мм (обычно 288 точек)", dpl: 288 },
      { id: "custom", label: "Вручную", dpl: null },
    ],
    []
  );
  const selectedPreset = useMemo(() => {
    if (dotsPerLine === 576) return "80";
    if (dotsPerLine === 384) return "58";
    if (dotsPerLine === 320) return "44";
    if (dotsPerLine === 288) return "38";
    return "custom";
  }, [dotsPerLine]);

  const applyPreset = useCallback(
    (presetId) => {
      const preset = presets.find((p) => p.id === presetId);
      if (!preset) return;
      if (preset.dpl) {
        const f = font === "A" ? "A" : "B";
        const charDotWidth = f === "B" ? 9 : 12;
        setDotsPerLine(preset.dpl);
        setCharsPerLine(Math.floor(preset.dpl / charDotWidth));
      }
    },
    [font, presets]
  );

  const save = useCallback(async () => {
    setMsg(null);
    setSaving(true);
    try {
      const dpl = Math.max(200, Number(dotsPerLine || 0));
      const cpl = Math.max(16, Number(charsPerLine || 0));
      const lh = Math.max(10, Number(lineHeight || 0));
      const f = font === "A" ? "A" : "B";
      const cp = Number(codepage || 0);

      setEscposDotsPerLine(dpl);
      setEscposCharsPerLine(cpl);
      setEscposLineHeight(lh);
      setEscposFont(f);
      if (Number.isFinite(cp) && cp >= 0 && cp <= 255) setEscposCodepage(cp);

      setMsg({ type: "success", text: "Сохранено (escpos_* в localStorage)" });
    } catch (_e) {
      setMsg({ type: "error", text: "Не удалось сохранить настройки" });
    } finally {
      setSaving(false);
    }
  }, [dotsPerLine, charsPerLine, lineHeight, font, codepage]);

  const testUsb = useCallback(async () => {
    setMsg(null);
    setTesting(true);
    try {
      await printRussianRawUsb("ТЕСТ: Привет, мир! Ёё № 123", { interactive: true });
      setMsg({ type: "success", text: "Тест отправлен на USB‑печать" });
    } catch (e) {
      setMsg({ type: "error", text: e?.message || "Не удалось отправить тест" });
    } finally {
      setTesting(false);
    }
  }, []);

  const msgClassName = useMemo(() => {
    if (!msg) return "";
    if (msg.type === "success") return "settings__notice settings__notice--success";
    if (msg.type === "error") return "settings__notice settings__notice--error";
    return "settings__notice settings__notice--info";
  }, [msg]);

  return (
    <PageShell className="settings">
      <PageHeader
        title="Печать чеков"
        subtitle="Настройки ESC/POS принтера для POS-кассы"
        actions={
          <button
            type="button"
            className="nur-btn nur-btn--secondary"
            onClick={() => navigate(-1)}
          >
            Назад
          </button>
        }
      />

      <PagePanel>
        <div className="settings__section settings__tab-content--print" style={{ marginBottom: 0 }}>
          <h2 className="settings__section-title">
            <span className="settings__emoji" aria-hidden>
              🖨️
            </span>{" "}
            POS принтер • ESC/POS
          </h2>

          <p className="settings__mutedText">
            Настройки сохраняются в <code>localStorage</code> и влияют на печать
            чеков (WebUSB / ESC/POS).
          </p>

          {msg && <div className={msgClassName}>{msg.text}</div>}

          <div className="settings__form-group nur-field">
            <label className="nur-label" htmlFor="pos-paper-width">
              Ширина бумаги
            </label>
            <select
              id="pos-paper-width"
              className="nur-select"
              value={selectedPreset}
              onChange={(e) => applyPreset(e.target.value)}
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings__form-group nur-field">
            <label className="nur-label" htmlFor="pos-dpl">
              DOTS_PER_LINE (точек по ширине, для PDF/картинок)
            </label>
            <input
              id="pos-dpl"
              className="nur-input"
              type="number"
              min={200}
              step={1}
              value={dotsPerLine}
              onChange={(e) => setDotsPerLine(Number(e.target.value))}
            />
          </div>

          <div className="settings__form-group nur-field">
            <label className="nur-label" htmlFor="pos-cpl">
              CHARS_PER_LINE (символов в строке, для текстовых чеков)
            </label>
            <input
              id="pos-cpl"
              className="nur-input"
              type="number"
              min={16}
              step={1}
              value={charsPerLine}
              onChange={(e) => setCharsPerLine(Number(e.target.value))}
            />
          </div>

          <div className="settings__form-group">
            <div className="nur-label">Шрифт</div>
            <div className="settings__segmented">
              <button
                type="button"
                className={`settings__segBtn ${font === "B" ? "settings__segBtn--active" : ""}`}
                onClick={() => setFont("B")}
              >
                Font B (узкий)
              </button>
              <button
                type="button"
                className={`settings__segBtn ${font === "A" ? "settings__segBtn--active" : ""}`}
                onClick={() => setFont("A")}
              >
                Font A (широкий)
              </button>
            </div>
          </div>

          <div className="settings__form-group nur-field">
            <label className="nur-label" htmlFor="pos-line">
              Межстрочный интервал (escpos_line)
            </label>
            <input
              id="pos-line"
              className="nur-input"
              type="number"
              min={10}
              step={1}
              value={lineHeight}
              onChange={(e) => setLineHeight(Number(e.target.value))}
            />
          </div>

          <div className="settings__form-group nur-field">
            <label className="nur-label" htmlFor="pos-codepage">
              CodePage (ESC/POS: ESC t n)
            </label>
            <select
              id="pos-codepage"
              className="nur-select"
              value={codepage}
              onChange={(e) => setCodepage(Number(e.target.value))}
            >
              <option value={17}>PC866 (17) — часто по умолчанию</option>
              <option value={66}>PC866 (66) — вариант у некоторых Xprinter</option>
              <option value={59}>PC866 Russian (59)</option>
              <option value={18}>PC852/alt (18)</option>
              <option value={73}>CP1251 (73)</option>
              <option value={22}>CP1251 (22)</option>
              <option value={255}>PC936 (GBK) — часто 255</option>
            </select>
            <div className="settings__fieldHint">
              Можно указать номер вручную (0–255), если в вашем принтере PC936 имеет
              другой номер.
            </div>
            <input
              className="nur-input"
              type="number"
              min={0}
              max={255}
              step={1}
              value={codepage}
              onChange={(e) => setCodepage(Number(e.target.value))}
              style={{ marginTop: 8 }}
              aria-label="CodePage вручную"
            />
            <div className="settings__fieldHint">
              Если печатает “кракозябрами” — попробуйте переключить <b>17 ↔ 66</b>{" "}
              или <b>PC866 ↔ CP1251</b>.
            </div>
          </div>

          <div className="settings__actions">
            <button
              type="button"
              className="nur-btn nur-btn--primary"
              onClick={save}
              disabled={saving}
            >
              {saving ? "Сохранение..." : "Сохранить"}
            </button>
            <button
              type="button"
              className="nur-btn nur-btn--secondary"
              onClick={testUsb}
              disabled={testing}
            >
              {testing ? "Отправка..." : "Тест USB‑печати"}
            </button>
          </div>
        </div>
      </PagePanel>
    </PageShell>
  );
}
