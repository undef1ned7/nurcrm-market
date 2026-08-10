import { AccessItem } from "./AccessItem";

export function AccessSection({
  title,
  items,
  selectedAccess,
  onToggle,
  onSelectAll,
  tone = "success",
  gridTone,
}) {
  if (!items?.length) return null;
  return (
    <div className="access-list-section">
      <div className="access-list-section__head">
        <h4 className="access-list-section__title">{title}</h4>
        <div className="access-list-section__actions">
          <button
            type="button"
            className="access-list-section__btn"
            onClick={() => onSelectAll(items, true)}
          >
            Выбрать все
          </button>
          <button
            type="button"
            className="access-list-section__btn"
            onClick={() => onSelectAll(items, false)}
          >
            Снять все
          </button>
        </div>
      </div>
      <div
        className={`access-list-grid${
          gridTone ? ` access-list-grid--${gridTone}` : ""
        }`}
      >
        {items.map((accessType) => (
          <AccessItem
            key={accessType.backendKey}
            accessType={accessType}
            checked={!!selectedAccess[accessType.backendKey]}
            onToggle={onToggle}
            tone={tone}
          />
        ))}
      </div>
    </div>
  );
}
// Базовые permissions (общие для всех секторов)
