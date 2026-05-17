import { COLORS } from "../constants/colors";

/**
 * LampPost — 校园旧式路灯。
 *
 * 铁艺灯柱 + 灯罩 + 发光光晕。
 * 使用圆柱和球体组合，风格偏手绘插画。
 */
export default function LampPost({ position = [0, 0, 0] }) {
  return (
    <group position={position}>
      {/* 灯柱 */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.04, 0.05, 2, 6]} />
        <meshStandardMaterial color={COLORS.lamp.pole} roughness={0.7} />
      </mesh>
      {/* 灯柱基座 */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.12, 6]} />
        <meshStandardMaterial color={COLORS.lamp.pole} roughness={0.7} />
      </mesh>
      {/* 灯臂（横杆） */}
      <mesh position={[0.2, 1.9, 0]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.4, 0.03, 0.03]} />
        <meshStandardMaterial color={COLORS.lamp.pole} roughness={0.7} />
      </mesh>
      {/* 灯罩 */}
      <mesh position={[0.35, 1.85, 0]}>
        <sphereGeometry args={[0.1, 6, 6]} />
        <meshStandardMaterial color={COLORS.lamp.glow} roughness={0.6} />
      </mesh>
      {/* 发光（半透明光晕） */}
      <mesh position={[0.35, 1.85, 0]}>
        <sphereGeometry args={[0.18, 6, 6]} />
        <meshStandardMaterial
          color={COLORS.lamp.glow}
          transparent
          opacity={0.2}
          roughness={0}
        />
      </mesh>
    </group>
  );
}
