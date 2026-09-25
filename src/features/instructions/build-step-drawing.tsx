import { rotateVector, type DraftBuildStep, type Model } from "@/core/model/public";
import { colors, partDefinitions } from "@/fixtures/catalog";

export type BuildDrawingView = "isometric" | "top";

/** Lightweight printable schematic projected from the actual scene coordinates. */
export function BuildStepDrawing({
  model,
  step,
  view = "isometric",
  focusAdditions = false,
  pieceLabels,
  className = "",
}: {
  model: Model;
  step: DraftBuildStep;
  view?: BuildDrawingView;
  focusAdditions?: boolean;
  pieceLabels?: ReadonlyMap<string, string>;
  className?: string;
}) {
  const visible = new Set(step.visiblePartIds);
  const added = new Set(step.newPartIds);
  const project = ({ x, y, z }: { x: number; y: number; z: number }) =>
    view === "top" ? { x: x * 20, y: z * 20 } : { x: (x - z) * 16, y: (x + z) * 8 - y * 20 };
  const shapes = model.instances
    .filter((instance) => visible.has(instance.id))
    .flatMap((instance) => {
      const part = partDefinitions.find((definition) => definition.id === instance.partId);
      if (!part) return [];
      function point(x: number, y: number, z: number) {
        const turned = rotateVector({ x, y, z }, instance.transform.rotation);
        return project({
          x: instance.transform.x + turned.x,
          y: instance.transform.y + turned.y,
          z: instance.transform.z + turned.z,
        });
      }
      const x = (part.width - 0.035) / 2;
      const z = (part.depth - 0.035) / 2;
      const bottom = -(part.height - 0.02) / 2;
      const top = -bottom;
      const low = part.shape === "slope" ? bottom + Math.min(0.36, part.height) : top;
      const corners = [
        point(-x, bottom, -z),
        point(x, bottom, -z),
        point(x, bottom, z),
        point(-x, bottom, z),
        point(-x, top, -z),
        point(x, top, -z),
        point(x, low, z),
        point(-x, low, z),
      ];
      const sides = [
        { corners: [0, 1, 5, 4], normal: { x: 0, y: 0, z: -1 } },
        { corners: [1, 2, 6, 5], normal: { x: 1, y: 0, z: 0 } },
        { corners: [2, 3, 7, 6], normal: { x: 0, y: 0, z: 1 } },
        { corners: [3, 0, 4, 7], normal: { x: -1, y: 0, z: 0 } },
      ];
      const faces = [
        ...(view === "top"
          ? []
          : sides
              .filter(({ normal }) => {
                const turned = rotateVector(normal, instance.transform.rotation);
                return turned.x + turned.z > 0;
              })
              .map((side) => side.corners)),
        [4, 5, 6, 7],
      ];
      const studs = part.studs
        ? Array.from({ length: part.width * part.depth }, (_, index) =>
            point(
              (index % part.width) - (part.width - 1) / 2,
              top + 0.1,
              Math.floor(index / part.width) - (part.depth - 1) / 2,
            ),
          )
        : [];
      return [
        {
          instance,
          part,
          corners,
          faces,
          studs,
          color: colors.find((color) => color.id === instance.colorId)?.hex ?? "#d8d4ca",
        },
      ];
    })
    .sort(
      (a, b) =>
        Number(added.has(a.instance.id)) - Number(added.has(b.instance.id)) ||
        a.instance.transform.y - b.instance.transform.y ||
        a.instance.transform.x +
          a.instance.transform.z -
          b.instance.transform.x -
          b.instance.transform.z,
    );
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  const framed = focusAdditions ? shapes.filter((shape) => added.has(shape.instance.id)) : shapes;
  for (const shape of framed)
    for (const point of [...shape.corners, ...shape.studs]) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  if (!framed.length) {
    minX = minY = -20;
    maxX = maxY = 20;
  } else {
    minX -= 20;
    minY -= 20;
    maxX += 20;
    maxY += 20;
  }
  return (
    <svg
      role="img"
      aria-label={`Instruction drawing: ${view === "top" ? "Top view" : "3D view"}, ${step.newPartIds.length} highlighted ${step.newPartIds.length === 1 ? "piece" : "pieces"}, ${step.visiblePartIds.length} ${step.visiblePartIds.length === 1 ? "piece" : "pieces"} shown`}
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      className={`w-full ${className}`}
    >
      <title>{`${view === "top" ? "Top view" : "3D view"} · ${step.title}: highlighted additions in their model positions`}</title>
      {shapes.map(({ instance, part, corners, faces, studs, color }) => (
        <g key={instance.id} opacity={added.has(instance.id) ? 1 : 0.3}>
          <title>{`${part.name} · ${instance.id}`}</title>
          {faces.map((face, index) => (
            <polygon
              key={index}
              points={face.map((corner) => `${corners[corner].x},${corners[corner].y}`).join(" ")}
              fill={color}
              stroke={added.has(instance.id) ? "#185c53" : "#5e6763"}
              strokeWidth={added.has(instance.id) ? 0.85 : 0.45}
              strokeLinejoin="round"
            />
          ))}
          {studs.map((stud, index) => (
            <ellipse
              key={index}
              cx={stud.x}
              cy={stud.y}
              rx={view === "top" ? 5 : 4}
              ry={view === "top" ? 5 : 2}
              fill={color}
              stroke="#455b55"
              strokeWidth="0.5"
            />
          ))}
        </g>
      ))}
      {pieceLabels &&
        shapes.map(({ instance, corners }) => {
          const label = pieceLabels.get(instance.id);
          if (!label) return null;
          const top = corners.slice(4);
          const x = top.reduce((sum, point) => sum + point.x, 0) / top.length;
          const y = top.reduce((sum, point) => sum + point.y, 0) / top.length;
          return (
            <g key={instance.id} aria-hidden="true">
              <circle cx={x} cy={y} r={7} fill="white" stroke="#185c53" strokeWidth={0.7} />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={8}
                fontFamily="sans-serif"
                fill="#185c53"
              >
                {label}
              </text>
            </g>
          );
        })}
    </svg>
  );
}
