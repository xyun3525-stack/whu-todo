import { COLORS } from "../constants/colors";

/**
 * Balcony — 露台 + 栏杆。
 * 地板 + 一排立柱 + 横梁，构成新古典主义露台。
 */
export default function Balcony({ width = 2, depth = 0.6, position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* 地板 */}
      <mesh position={[0, 0.04, 0]}>
        <boxGeometry args={[width, 0.08, depth]} />
        <meshStandardMaterial color={COLORS.base.step} roughness={0.9} flatShading />
      </mesh>
      {/* 栏杆立柱 */}
      {Array.from({ length: Math.floor(width / 0.25) + 1 }).map((_, i) => {
        const x = -width / 2 + i * 0.25;
        return (
          <mesh key={i} position={[x, 0.3, -depth / 2 + 0.04]}>
            <boxGeometry args={[0.04, 0.5, 0.04]} />
            <meshStandardMaterial color={COLORS.wall.stoneLight} roughness={0.8} />
          </mesh>
        );
      })}
      {/* 扶手横梁 */}
      <mesh position={[0, 0.55, -depth / 2 + 0.04]}>
        <boxGeometry args={[width - 0.1, 0.05, 0.06]} />
        <meshStandardMaterial color={COLORS.wall.stoneLight} roughness={0.8} />
      </mesh>
    </group>
  );
}
