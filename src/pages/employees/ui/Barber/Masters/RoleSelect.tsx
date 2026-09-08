import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaSearch } from "react-icons/fa";

const RoleSelect = ({
  options,
  value,
  onChange,
  placeholder,
  className = "",
  hideCurrentLabelInMenu = false,
}: any) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const refWrap = useRef<any>(null);
  const refSearchInput = useRef<any>(null);

  const labelByKey = useMemo(() => {
    const m = new Map();
    options.forEach((o: any) => m.set(o.key, o.label));
    return m;
  }, [options]);

  const filtered = useMemo(() => {
    const txt = q.trim().toLowerCase();
    let list = !txt
      ? options
      : options.filter((o: any) => o.label.toLowerCase().includes(txt));
    if (hideCurrentLabelInMenu)
      list = list.filter((o: any) => o.label !== placeholder);
    return list;
  }, [options, q, hideCurrentLabelInMenu, placeholder]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: any) => {
      if (!refWrap.current) return;
      if (!refWrap.current.contains(e.target)) setOpen(false);
    };
    const onEsc = (e: any) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      refSearchInput.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <div
      className={`barbermasters__select ${open ? "is-open" : ""} ${className}`}
      ref={refWrap}
    >
      <button
        type="button"
        className="barbermasters__selectControl"
        onClick={() => setOpen((s) => !s)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span
          className={`barbermasters__selectValue ${
            value ? "" : "is-placeholder"
          }`}
        >
          {value ? labelByKey.get(value) || placeholder : placeholder}
        </span>
        <span className="barbermasters__selectCaret" aria-hidden />
      </button>

      {open && (
        <div className="barbermasters__selectMenu" role="listbox">
          <div className="barbermasters__selectSearch">
            <FaSearch className="barbermasters__selectSearchIcon" />
            <input
              ref={refSearchInput}
              className="barbermasters__selectSearchInput"
              placeholder={t("crm.employees.roleSearchPlaceholder")}
              value={q}
              onChange={(e: any) => setQ(e.target.value)}
            />
          </div>

          <div className="barbermasters__selectList" tabIndex={-1}>
            {filtered.length === 0 ? (
              <div className="barbermasters__selectEmpty">
                {t("common.nothingFound")}
              </div>
            ) : (
              filtered.map((o: any) => (
                <button
                  key={o.key}
                  type="button"
                  className={`barbermasters__selectItem ${
                    o.key === value ? "is-active" : ""
                  }`}
                  onClick={() => {
                    onChange(o.key);
                    setOpen(false);
                  }}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleSelect;
export { RoleSelect };
