import { rotateVector, type DraftBuildStep, type Model } from "@/core/model/public";
import { colors, partDefinitions } from "@/fixtures/catalog";

/** Lightweight printable schematic projected from the actual scene coordinates. */
export function BuildStepDrawing({
  model,
  step,
  className = "",
}: {
  model: Model;
  step: DraftBuildStep;
  className?: string;
}) {
  const visible = new Set(step.visiblePartIds);
  const added = new Set(step.newPartIds);
  const project = ({ x, y, z }: { x: number; y: number; z: number }) => ({
    x: (x - z) * 16,
    y: (x + z) * 8 - y * 20,
  });
  const shapes = model.instances
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
      const faces = [
        [0, 1, 5, 4],
        [1, 2, 6, 5],
        [2, 3, 7, 6],
        [3, 0, 4, 7],
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
        a.instance.transform.x +
          a.instance.transform.z -
          b.instance.transform.x -
          b.instance.transform.z || a.instance.transform.y - b.instance.transform.y,
    );
  let minX = 0,
    minY = 0,
    maxX = 0,
    maxY = 0;
  for (const shape of shapes)
    for (const point of [...shape.corners, ...shape.studs]) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  minX -= 20;
  minY -= 20;
  maxX += 20;
  maxY += 20;
  return (
    <svg
      role="img"
      aria-label={`Instruction drawing: ${step.newPartIds.length} highlighted ${step.newPartIds.length === 1 ? "piece" : "pieces"}, ${step.visiblePartIds.length} ${step.visiblePartIds.length === 1 ? "piece" : "pieces"} shown`}
      viewBox={`${minX} ${minY} ${maxX - minX} ${maxY - minY}`}
      className={`w-full ${className}`}
    >
      <title>{step.title}: highlighted additions in their model positions</title>
      {shapes
        .filter(({ instance }) => visible.has(instance.id))
        .map(({ instance, part, corners, faces, studs, color }) => (
          <g key={instance.id} opacity={added.has(instance.id) ? 1 : 0.3}>
            <title>
              {part.name} · {instance.id}
            </title>
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
                rx="4"
                ry="2"
                fill={color}
                stroke="#455b55"
                strokeWidth="0.5"
              />
            ))}
          </g>
        ))}
    </svg>
  );
}
