import type { PartDefinition } from "@/core/model/public";

function DetailSilhouette({ part }: { part: PartDefinition }) {
  const { shape, width, height } = part;
  if (shape === "door-assembly")
    return (
      <>
        <path d="M 34 12 L 39 9 H 70 V 63 L 65 67 H 34 Z" />
        <path d="M 65 12 L 70 9 V 63 L 65 67 Z" fill="currentColor" fillOpacity="0.12" />
        <rect x="34" y="12" width="31" height="55" />
        <rect x="38" y="17" width="23" height="45" fill="currentColor" fillOpacity="0.16" />
        <path d="M 41 20 H 58 V 59 H 41 Z" fill="none" />
        <rect x="37" y="25" width="4" height="5" />
        <rect x="37" y="49" width="4" height="5" />
        <circle cx="57" cy="41" r="1.7" fill="currentColor" fillOpacity="0.6" />
        <ellipse cx="43" cy="10" rx="3" ry="1.5" />
        <ellipse cx="58" cy="10" rx="3" ry="1.5" />
      </>
    );
  if (shape === "leaf" || shape === "leaf-upright")
    return (
      <>
        <path d="M 47 67 Q 54 42 48 12" fill="none" stroke="currentColor" strokeWidth="2" />
        {[24, 38, 51].map((y) => (
          <g key={y}>
            <path d={`M 50 ${y + 6} Q 28 ${y + 9} 23 ${y - 8} Q 43 ${y - 8} 50 ${y + 6}`} />
            <path d={`M 51 ${y + 4} Q 71 ${y + 6} 78 ${y - 10} Q 58 ${y - 9} 51 ${y + 4}`} />
          </g>
        ))}
        <path d="M 49 25 Q 36 15 49 5 Q 63 16 49 25" />
      </>
    );
  if (shape === "branch")
    return (
      <>
        <path d="M 46 66 L 49 12 Q 53 9 56 13 L 53 66 Z" />
      </>
    );
  if (shape === "roof-tile")
    return (
      <>
        <path d="M 24 36 Q 37 19 50 36 L 77 51 Q 64 34 51 51 Z" />
        <path d="M 24 36 L 51 51 L 51 56 L 24 41 Z" fill="currentColor" fillOpacity="0.15" />
        <path d="M 51 51 Q 64 34 77 51 L 77 56 Q 64 39 51 56 Z" />
        <path
          d="M 29 35 Q 36 26 44 34 L 70 49"
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.13"
        />
      </>
    );
  if (shape === "planter") {
    const radius = 29;
    const depth = Math.min(37, (height / width) * 45);
    const top = 36 - depth / 2;
    return (
      <>
        <path
          d={`M ${50 - radius} ${top} L 29 ${top + depth} Q 50 ${top + depth + 14} 71 ${top + depth} L ${50 + radius} ${top} Z`}
        />
        <ellipse cx="50" cy={top} rx={radius} ry="12" />
        <ellipse cx="50" cy={top} rx="23" ry="8" fill="currentColor" fillOpacity="0.28" />
        <path d={`M 27 ${top + 3} Q 50 ${top + 14} 73 ${top + 3}`} fill="none" />
      </>
    );
  }
  if (shape === "arch" || shape === "arch-panel" || shape === "arch-spandrel") {
    const scale = Math.min(60 / width, 57 / height);
    const left = 50 - (width * scale) / 2,
      right = 50 + (width * scale) / 2,
      bottom = 66;
    const top = bottom - height * scale,
      radius = (width * scale) / 2;
    const spring = top + radius;
    const wall = width * 0.12 * scale;
    const outer =
      shape === "arch-spandrel"
        ? `M ${left} ${top} H ${right} V ${bottom} H ${left} Z`
        : `M ${left} ${bottom} V ${spring} A ${radius} ${radius} 0 0 1 ${right} ${spring} V ${bottom} Z`;
    const opening =
      shape === "arch"
        ? `M ${left + wall} ${bottom + 1} V ${spring} A ${radius - wall} ${radius - wall} 0 0 1 ${right - wall} ${spring} V ${bottom + 1} Z`
        : shape === "arch-spandrel"
          ? `M ${left} ${bottom + 1} V ${bottom} A ${radius} ${radius} 0 0 1 ${right} ${bottom} V ${bottom + 1} Z`
          : "";
    return (
      <>
        <path
          d={`${outer} ${opening}`}
          fillRule="evenodd"
          transform="translate(3 -2)"
          fill="currentColor"
          fillOpacity="0.12"
        />
        <path d={`${outer} ${opening}`} fillRule="evenodd" />
      </>
    );
  }
  return null;
}

export function PartPreview({ part, color }: { part: PartDefinition; color: string }) {
  const scale = Math.min(
    19,
    70 / (part.width + part.depth),
    56 / ((part.width + part.depth) * 0.5 + part.height * 1.5 + 0.2),
  );
  const centerY = 38 + part.height * scale * 0.75;
  const project = (x: number, y: number, z: number) =>
    `${50 + (x - z) * scale},${centerY + (x + z) * scale * 0.5 - y * scale * 1.5}`;
  const x = part.width / 2;
  const z = part.depth / 2;
  const h = part.height;
  const slope = part.shape === "slope";
  const frontHeight = slope ? 0.05 : h;
  return (
    <svg viewBox="0 0 100 76" className="h-full w-full" aria-hidden="true">
      <ellipse cx="50" cy="61" rx="31" ry="5" fill="currentColor" opacity="0.06" />
      <g
        fill={color}
        stroke="currentColor"
        strokeOpacity="0.18"
        strokeWidth="0.65"
        strokeLinejoin="round"
      >
        {(
          [
            "door-assembly",
            "arch",
            "arch-panel",
            "arch-spandrel",
            "leaf",
            "leaf-upright",
            "branch",
            "planter",
            "roof-tile",
          ] as readonly PartDefinition["shape"][]
        ).includes(part.shape) ? (
          <DetailSilhouette part={part} />
        ) : part.shape === "cylinder" ? (
          part.id.includes("wheel") ? (
            <>
              <ellipse cx="53" cy="43" rx="20" ry="24" />
              <ellipse cx="47" cy="42" rx="20" ry="24" />
              <ellipse cx="47" cy="42" rx="10" ry="13" fill="currentColor" fillOpacity="0.2" />
              <ellipse cx="47" cy="42" rx="4" ry="5" fill="currentColor" fillOpacity="0.3" />
            </>
          ) : (
            <>
              <path d={`M 24 36 V ${36 + h * 22} A 26 13 0 0 0 76 ${36 + h * 22} V 36`} />
              <ellipse cx="50" cy="36" rx="26" ry="13" />
              {part.studs && <ellipse cx="50" cy="31" rx="10" ry="5" />}
            </>
          )
        ) : (
          <>
            <polygon
              points={[
                project(-x, 0, z),
                project(x, 0, z),
                project(x, frontHeight, z),
                project(-x, frontHeight, z),
              ].join(" ")}
            />
            <polygon
              points={[
                project(x, 0, z),
                project(x, 0, -z),
                project(x, h, -z),
                project(x, frontHeight, z),
              ].join(" ")}
            />
            <polygon
              fill="currentColor"
              fillOpacity="0.13"
              points={[
                project(x, 0, z),
                project(x, 0, -z),
                project(x, h, -z),
                project(x, frontHeight, z),
              ].join(" ")}
            />
            <polygon
              points={[
                project(-x, h, -z),
                project(x, h, -z),
                project(x, frontHeight, z),
                project(-x, frontHeight, z),
              ].join(" ")}
            />
            {part.studs &&
              Array.from({ length: part.width * part.depth }, (_, index) => {
                const cx = (index % part.width) - (part.width - 1) / 2;
                const cz = Math.floor(index / part.width) - (part.depth - 1) / 2;
                const [sx, sy] = project(cx, h + 0.12, cz)
                  .split(",")
                  .map(Number);
                return <ellipse key={index} cx={sx} cy={sy} rx={scale * 0.27} ry={scale * 0.14} />;
              })}
          </>
        )}
      </g>
    </svg>
  );
}
