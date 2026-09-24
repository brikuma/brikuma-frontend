import { Check } from "lucide-react";
import { colors } from "@/fixtures/catalog";

export function ColorPalette({
  colorId,
  onChange,
  label,
  disabled = false,
}: {
  colorId: string;
  onChange: (colorId: string) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-8 gap-0.5" role="group" aria-label={label}>
      {colors.map((color) => (
        <button
          key={color.id}
          type="button"
          className={`flex h-7 min-w-0 items-center justify-center rounded-sm border transition-colors ${colorId === color.id ? "border-primary bg-primary-muted" : "border-transparent hover:bg-surface-muted"}`}
          aria-label={`${label}: ${color.name}`}
          aria-pressed={colorId === color.id}
          title={color.name}
          disabled={disabled}
          onClick={() => onChange(color.id)}
        >
          <span
            className="flex size-4 items-center justify-center rounded-[3px] border border-foreground/20"
            style={{ backgroundColor: color.hex }}
          >
            {colorId === color.id && (
              <Check
                size={11}
                className="rounded-[2px] bg-surface text-foreground"
                strokeWidth={2.5}
              />
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
