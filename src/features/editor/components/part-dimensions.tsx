import { formatCentimeters, type PartDefinition, type QuarterTurn } from "@/core/model/public";

export function PartDimensions({
  part,
  rotation = 0,
  label = "Part dimensions",
}: {
  part: PartDefinition;
  rotation?: QuarterTurn;
  label?: string;
}) {
  const turned = rotation === 90 || rotation === 270;
  return (
    <dl aria-label={label} className="grid grid-cols-3 gap-2 text-xs">
      {[
        ["Width", turned ? part.depth : part.width],
        ["Depth", turned ? part.width : part.depth],
        ["Height", part.height],
      ].map(([name, value]) => (
        <div key={name}>
          <dt className="text-muted-foreground">{name}</dt>
          <dd className="mt-0.5 font-mono tabular-nums text-foreground">
            {formatCentimeters(Number(value))}{" "}
            <span className="font-sans text-muted-foreground">cm</span>
          </dd>
        </div>
      ))}
    </dl>
  );
}
