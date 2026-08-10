export function AccessItem({ accessType, checked, onToggle, tone = "success" }) {
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
      <span>{accessType.label}</span>
    </label>
  );
}

