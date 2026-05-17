import { COLORS } from "../constants/colors";

/**
 * Pillar — 壁柱/圆柱，用于柱廊和入口。
 * 三段式：柱础 + 柱身 + 柱头，产生经典建筑比例感。
 */
export default function Pillar({ position = [0, 0, 0], height = 2.8, radius = 0.2 }) {
  return (
    <group position={position}>
      {/* 柱础 */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[radius + 0.06, radius + 0.1, 0.12, 8]} />
        <meshStandardMaterial color={COLORS.wall.stoneLight} roughness={0.9} />
      </mesh>
      {/* 柱身 */}
      <mesh position={[0, height / 2 + 0.12, 0]}>
        <cylinderGeometry args={[radius, radius * 0.9, height, 8]} />
        <meshStandardMaterial
          color={COLORS.wall.stone}
          roughness={0.85}
          flatShading
        />
      </mesh>
      {/* 柱头 */}
      <mesh position={[0, height + 0.12, 0]}>
        <cylinderGeometry args={[radius + 0.08, radius + 0.04, 0.12, 8]} />
        <meshStandardMaterial color={COLORS.wall.trim} roughness={0.8} />
      </mesh>
    </group>
  );
}
