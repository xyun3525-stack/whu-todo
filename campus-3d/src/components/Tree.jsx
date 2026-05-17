import { useMemo } from "react";
import * as THREE from "three";
import { COLORS, GEOMETRY } from "../constants/colors";

/**
 * Tree — 樱花树或梧桐树。
 *
 * 树干用圆柱，树冠用多层重叠球体组合成蓬松云朵状。
 * 用 seed 伪随机控制树形变异（冠幅、高度、花的密度）。
 */
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export default function Tree({
  position = [0, 0, 0],
  seed = "sakura",
  scale = 1,
}) {
  // 用 seed 生成伪随机树形参数
  const params = useMemo(() => {
    const r = (n) => (simpleHash(seed + n) % 1000) / 1000;
    const isCherry = r("type") > 0.45;
    return {
      isCherry,
      trunkHeight: 1.0 + r("h") * 0.6,
      trunkRadius: 0.06 + r("r") * 0.04,
      crownRadius: 1.0 + r("c") * 0.6,
      layerCount: 2 + Math.floor(r("l") * 2),
      color: isCherry ? COLORS.tree.cherryBlossom : COLORS.tree.planeLeaf,
      colorLight: isCherry ? COLORS.tree.cherryLight : COLORS.tree.planeLight,
      colorDark: isCherry ? COLORS.tree.cherryDark : COLORS.tree.planeLeaf,
      hasFlowers: isCherry,
    };
  }, [seed]);

  // 树冠：多层重叠球体
  const crownLayers = useMemo(() => {
    const layers = [];
    for (let i = 0; i < params.layerCount; i++) {
      const t = i / params.layerCount;
      const r = params.crownRadius * (1 - t * 0.3);
      const y = params.trunkHeight + t * params.crownRadius * 0.6;
      layers.push({ y, r });
    }
    return layers;
  }, [params]);

  return (
    <group position={position} scale={scale}>
      {/* 树干 */}
      <mesh position={[0, params.trunkHeight / 2, 0]}>
        <cylinderGeometry args={[params.trunkRadius, params.trunkRadius * 1.3, params.trunkHeight, 6]} />
        <meshStandardMaterial color={COLORS.tree.trunk} roughness={0.9} flatShading />
      </mesh>
      {/* 树冠 */}
      {crownLayers.map((layer, i) => (
        <mesh key={i} position={[0, layer.y, 0]}>
          <sphereGeometry args={[layer.r, 8, 6]} />
          <meshStandardMaterial
            color={i === 0 ? params.colorDark : i === params.layerCount - 1 ? params.colorLight : params.color}
            roughness={0.9}
            flatShading
          />
        </mesh>
      ))}
      {/* 樱花点缀（樱花树额外加小色块） */}
      {params.hasFlowers &&
        crownLayers.map((layer, i) => {
          if (i === 0) return null;
          const angle = (i * 1.7) % (Math.PI * 2);
          return (
            <mesh
              key={`f${i}`}
              position={[
                Math.cos(angle) * layer.r * 0.6,
                layer.y + 0.1,
                Math.sin(angle) * layer.r * 0.6,
              ]}
            >
              <sphereGeometry args={[0.08, 4, 4]} />
              <meshStandardMaterial color={COLORS.tree.cherryLight} roughness={1} />
            </mesh>
          );
        })}
    </group>
  );
}
