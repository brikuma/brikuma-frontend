import { DoubleSide } from "three";
import type { StudContact } from "@/core/model/public";

/** Rings identify real matching sites; they are visual helpers, never counted parts. */
export function ConnectionMarkers({ contacts }: { contacts: readonly StudContact[] }) {
  return (
    <group userData={{ studioHelper: true }}>
      {contacts.map((site) => (
        <mesh
          key={`${site.supportId}-${site.x}-${site.z}`}
          position={[site.x, site.y + 0.205, site.z]}
          rotation={[-Math.PI / 2, 0, 0]}
          raycast={() => null}
          renderOrder={12}
        >
          <ringGeometry args={[0.23, 0.31, 32]} />
          <meshBasicMaterial
            color="#24b88a"
            side={DoubleSide}
            depthTest={false}
            depthWrite={false}
            transparent
            opacity={0.9}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}
