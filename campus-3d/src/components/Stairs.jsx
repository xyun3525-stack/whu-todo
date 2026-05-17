import { COLORS } from "../constants/colors";

/**
 * Stairs — 多级宽石阶，每级逐层抬高。
 * 台阶阵列从前到后逐级升高，模拟入口门廊的庄重感。
 */
export default function Stairs({ count = 5, width = 2.4, position = [0, 0, 0] }) {
  const steps = [];
  const stepDepth = 0.35;
  const stepHeight = 0.18;

  for (let i = 0; i < count; i++) {
    const zOffset = -i * stepDepth;
    const yOffset = i * stepHeight;
    // 每级略微收窄，产生透视感
    const w = width - i * 0.04;
    steps.push(
      <mesh key={i} position={[0, yOffset + stepHeight / 2, zOffset]}>
        <boxGeometry args={[w, stepHeight, stepDepth]} />
        <meshStandardMaterial
          color={i === 0 ? COLORS.base.step : COLORS.base.mid}
          roughness={0.9}
          flatShading
        />
      </mesh>
    );
  }

  return <group position={position}>{steps}</group>;
}
