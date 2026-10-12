/** Minimal select used by barber payroll/history headers. */
export default function BarberSelect({
  value,
  onChange,
  options = [],
  placeholder,
  ...rest
}: any) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange?.(e.target.value)}
      {...rest}
    >
      {placeholder ? (
        <option value="" disabled>
          {placeholder}
        </option>
      ) : null}
      {(options || []).map((o: any) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
