import { useTranslation } from "react-i18next";
import { accessLabel } from "../accessLabelI18n";

export function AccessItem({ accessType, checked, onToggle, tone = "success" }) {
  const { t } = useTranslation();
  return (
    <label
      className={`access-list-item access-list-item--${tone}${
        checked ? " is-checked" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={() => onToggle(accessType.backendKey)}
      />
      <span>{accessLabel(accessType.label, t)}</span>
    </label>
  );
}
