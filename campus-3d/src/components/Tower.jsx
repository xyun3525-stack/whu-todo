import { COLORS } from "../constants/colors";
import Roof from "./Roof";

/**
 * Tower — 钟楼/塔楼，位于主楼中央或一侧。
 *
 * 由塔身+四角小墩+塔顶攒尖顶组成，顶部有金色宝顶装饰。
 * 塔身正面设拱形钟窗。
 */
export default function Tower({ position = [0, 0, 0], width = 2.2, depth = 2.2 }) {
  return (
    <group position={position}>
      {/* 塔身主体 */}
      <mesh position={[0, 1.25, 0]}>
        <boxGeometry args={[width, 2.5, depth]} />
        <meshStandardMaterial color={COLORS.wall.brick} roughness={0.85} flatShading />
      </mesh>
      {/* 塔身四角壁柱 */}
      {[
        [-1, 1],
        [1, 1],
        [-1, -1],
        [1, -1],
      ].map(([sx, sz], i) => (
        <mesh key={i} position={[sx * (width / 2 - 0.1), 1.25, sz * (depth / 2 - 0.1)]}>
          <boxGeometry args={[0.12, 2.5, 0.12]} />
          <meshStandardMaterial color={COLORS.wall.stoneLight} roughness={0.8} />
        </mesh>
      ))}
      {/* 塔身横向线脚 */}
      <mesh position={[0, 2.4, 0]}>
        <boxGeometry args={[width + 0.2, 0.1, depth + 0.2]} />
        <meshStandardMaterial color={COLORS.wall.trim} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[width + 0.2, 0.1, depth + 0.2]} />
        <meshStandardMaterial color={COLORS.wall.trim} roughness={0.8} />
      </mesh>
      {/* 钟窗（拱形） */}
      <mesh position={[width / 2 + 0.01, 1.4, 0]}>
        <boxGeometry args={[0.08, 0.6, 0.4]} />
        <meshStandardMaterial color={COLORS.glass.mid} transparent opacity={0.5} />
      </mesh>
      {/* 塔顶攒尖屋顶 */}
      <Roof width={width + 0.4} depth={depth + 0.4} overhang={0.15} baseY={2.5} />
      {/* 宝顶 */}
      <mesh position={[0, 3.8, 0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color={COLORS.accent.gold} roughness={0.4} metalness={0.3} />
      </mesh>
      <mesh position={[0, 3.95, 0]}>
        <coneGeometry args={[0.06, 0.15, 6]} />
        <meshStandardMaterial color={COLORS.accent.gold} roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  );
}
