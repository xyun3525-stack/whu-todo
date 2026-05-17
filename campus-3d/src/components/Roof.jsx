import { COLORS } from "../constants/colors";

/**
 * Roof — multi-tiered Chinese hip/gable roof (歇山顶风格).
 *
 * Built from overlapping rectangular prisms that step inward, creating
 * the layered silhouette of traditional Chinese roof tiles.
 * Each tier has a slightly darker underside to create depth.
 */
export default function Roof({ width, depth, overhang = 0.6, baseY = 0 }) {
  const roofW = width + overhang * 2;
  const roofD = depth + overhang * 2;

  return (
    <group position={[0, baseY, 0]}>
      {/* Tier 1 (bottom) — main roof body */}
      <group>
        <mesh position={[0, 0.15, 0]}>
          <boxGeometry args={[roofW, 0.3, roofD]} />
          <meshStandardMaterial color={COLORS.roof.mid} roughness={0.9} />
        </mesh>
        {/* Eaves — slightly wider rim */}
        <mesh position={[0, 0.05, 0]}>
          <boxGeometry args={[roofW + 0.1, 0.08, roofD + 0.1]} />
          <meshStandardMaterial color={COLORS.roof.edge} roughness={0.9} />
        </mesh>
      </group>

      {/* Tier 2 (middle) — stepped inward */}
      <mesh position={[0, 0.55, 0]}>
        <boxGeometry args={[roofW - 0.8, 0.5, roofD - 0.6]} />
        <meshStandardMaterial color={COLORS.roof.mid} roughness={0.9} />
      </mesh>

      {/* Tier 3 (top ridge) — narrow crest */}
      <mesh position={[0, 1.0, 0]}>
        <boxGeometry args={[roofW - 1.6, 0.4, roofD - 1.2]} />
        <meshStandardMaterial color={COLORS.roof.light} roughness={0.9} />
      </mesh>

      {/* Ridge ornament — center peak */}
      <mesh position={[0, 1.3, 0]}>
        <boxGeometry args={[roofW - 2.4, 0.2, 0.3]} />
        <meshStandardMaterial color={COLORS.roof.ridge} roughness={0.9} />
      </mesh>
    </group>
  );
}
