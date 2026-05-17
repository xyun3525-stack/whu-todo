import { COLORS } from "../constants/colors";

/**
 * StonePath — 石板路，通往建筑入口。
 * 由一组略微错开的扁平长方体组成，模拟拼铺石板。
 */
export default function StonePath({ position = [0, 0, 0], length = 3, width = 1.2 }) {
  const stones = [];
  const count = Math.floor(length / 0.4);

  for (let i = 0; i < count; i++) {
    const z = -i * 0.4 + 0.2;
    const offsetX = i % 2 === 0 ? 0 : 0.06;
    const stoneW = width * (0.8 + (i % 3) * 0.1);
    const stoneD = 0.3 + (i % 4) * 0.025;
    stones.push(
      <mesh key={i} position={[offsetX, -0.01, z]}>
        <boxGeometry args={[stoneW, 0.03, stoneD]} />
        <meshStandardMaterial color={COLORS.terrain.pathDark} roughness={0.95} flatShading />
      </mesh>
    );
  }

  return <group position={position}>{stones}</group>;
}
