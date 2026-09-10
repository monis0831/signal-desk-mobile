export type Segment<T extends string> = { value: T; label: string; tone?: "primary" | "armed" };

export function Segmented<T extends string>({
  value,
  segments,
  onChange,
  disabled,
}: {
  value: T;
  segments: Segment<T>[];
  onChange: (next: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="segmented" role="tablist">
      {segments.map((seg) => {
        const active = seg.value === value;
        const className = [active && "active", active && seg.tone && `tone-${seg.tone}`]
          .filter(Boolean)
          .join(" ");
        return (
          <button
            key={seg.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={className}
            disabled={disabled}
            onClick={() => onChange(seg.value)}
          >
            {seg.label}
          </button>
        );
      })}
    </div>
  );
}
