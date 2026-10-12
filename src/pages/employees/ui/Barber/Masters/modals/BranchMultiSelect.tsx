type BranchOption = { id: string | number; name?: string };

type BranchMultiSelectProps = {
  branches: BranchOption[];
  value: string[];
  onChange: (next: string[]) => void;
  emptyLabel: string;
};

/**
 * Выбор нескольких филиалов сотрудника. Порядок выбора сохраняется: первый
 * выбранный — основной (бэк берёт его как `primary_branch`).
 */
export default function BranchMultiSelect({
  branches,
  value,
  onChange,
  emptyLabel,
}: BranchMultiSelectProps) {
  const selected = new Set(value.map(String));

  const toggle = (id: string) => {
    onChange(
      selected.has(id) ? value.filter((v) => String(v) !== id) : [...value, id],
    );
  };

  if (!branches.length) {
    return <span className="barbermasters__label">{emptyLabel}</span>;
  }

  return (
    <div
      role="group"
      style={{ display: "flex", flexDirection: "column", gap: 6 }}
    >
      {branches.map((b) => {
        const id = String(b.id);
        const isPrimary = value.length > 0 && String(value[0]) === id;
        return (
          <label
            key={id}
            style={{ display: "flex", alignItems: "center", gap: 8 }}
          >
            <input
              type="checkbox"
              checked={selected.has(id)}
              onChange={() => toggle(id)}
            />
            <span>{b.name || id}</span>
            {isPrimary && value.length > 1 && (
              <span style={{ opacity: 0.6, fontSize: 12 }}>основной</span>
            )}
          </label>
        );
      })}
    </div>
  );
}
