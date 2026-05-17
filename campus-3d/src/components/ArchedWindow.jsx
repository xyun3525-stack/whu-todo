import * as THREE from "three";
import { useMemo } from "react";
import { COLORS, GEOMETRY } from "../constants/colors";

/**
 * ArchedWindow — 拱形窗，带窗框和窗台。
 * 用 THREE.Shape 画一个矩形+半圆拱的组合形状，然后挤出厚度。
 */
export default function ArchedWindow({
  width = GEOMETRY.archWindow.width,
  height = GEOMETRY.archWindow.height,
  archHeight = GEOMETRY.archWindow.archHeight,
  depth = GEOMETRY.archWindow.depth,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) {
  // 窗框外形：拱形
  const frameShape = useMemo(() => {
    const s = new THREE.Shape();
    const hw = width / 2;
    s.moveTo(-hw, -height / 2);
    s.lineTo(-hw, height / 2 - archHeight);
    s.quadraticCurveTo(-hw, height / 2 + archHeight, 0, height / 2 + archHeight);
    s.quadraticCurveTo(hw, height / 2 + archHeight, hw, height / 2 - archHeight);
    s.lineTo(hw, -height / 2);
    s.lineTo(-hw, -height / 2);
    return s;
  }, [width, height, archHeight]);

  // 玻璃面（内缩一点点）
  const glassShape = useMemo(() => {
    const s = new THREE.Shape();
    const inset = 0.04;
    const hw = width / 2 - inset;
    const hh = height / 2 - inset;
    const ah = archHeight - inset;
    s.moveTo(-hw, -hh);
    s.lineTo(-hw, hh - ah);
    s.quadraticCurveTo(-hw, hh + ah * 0.8, 0, hh + ah * 0.8);
    s.quadraticCurveTo(hw, hh + ah * 0.8, hw, hh - ah);
    s.lineTo(hw, -hh);
    s.lineTo(-hw, -hh);
    return s;
  }, [width, height, archHeight]);

  return (
    <group position={position} rotation={rotation}>
      {/* 窗框 */}
      <mesh>
        <extrudeGeometry args={[frameShape, { depth, bevelEnabled: false }]} />
        <meshStandardMaterial color={COLORS.wall.trim} roughness={0.8} />
      </mesh>
      {/* 玻璃 */}
      <mesh position={[0, 0, depth * 0.5 + 0.002]}>
        <shapeGeometry args={[glassShape]} />
        <meshStandardMaterial
          color={COLORS.glass.mid}
          transparent
          opacity={0.5}
          roughness={0.1}
          metalness={0.05}
        />
      </mesh>
      {/* 窗台 */}
      <mesh position={[0, -height / 2, depth / 2]}>
        <boxGeometry args={[width + 0.1, 0.05, depth + 0.06]} />
        <meshStandardMaterial color={COLORS.wall.stoneLight} roughness={0.9} />
      </mesh>
    </group>
  );
}
