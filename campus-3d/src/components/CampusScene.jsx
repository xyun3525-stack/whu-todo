import { useEffect } from "react";
import { OrthographicCamera, ContactShadows, Sky } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { COLORS, CAMERA } from "../constants/colors";
import MainBuilding from "./MainBuilding";
import Tree from "./Tree";
import LampPost from "./LampPost";
import StonePath from "./StonePath";

/**
 * CampusScene — 校园场景入口组件。
 *
 * 等距摄影机（OrthographicCamera）布置：
 * — 相机位于 (8, 8, 8)，这是经典等距视角：水平45°旋转，垂直约35°俯角。
 * — 因为使用 OrthographicCamera，场景完全没有透视变形，物体远近不缩放。
 * — 这是"2.5D"的核心：3D几何体 + 2D投影。
 *
 * 光照：
 * — AmbientLight 提供基础照明（flat color的基础）
 * — DirectionalLight 从左上照射，产生明确的亮面和暗面
 * — ContactShadows 在建筑底部产生柔和接触阴影
 *
 * 场景布局：
 * — 主建筑居中
 * — 树、路灯、石板路线性排列在建筑前方
 */
export default function CampusScene() {
  const { scene } = useThree();

  // Scene background color — 柔和的春日天空
  useEffect(() => {
    scene.background = new THREE.Color(COLORS.sky);
  }, [scene]);

  return (
    <>
      {/* ===== 等距摄影机 ===== */}
      {/*
          OrthographicCamera 是 2.5D 的核心：
          没有近大远小的透视变形，所有物体以相同比例呈现。
          位置 (8,8,8) 给出经典的等距视角。

          zoom 值控制场景在视口中的大小。
      */}
      <OrthographicCamera
        makeDefault
        position={CAMERA.position}
        zoom={CAMERA.zoom}
        near={CAMERA.near}
        far={CAMERA.far}
      />

      {/* ===== 光照 ===== */}
      {/*
          AmbientLight 为所有面提供均匀基础亮度，
          使暗面不至于全黑，是 flat color 风格的基础。

          DirectionalLight 从左上照射，产生明确的亮/暗面区分，
          让等距视角下的建筑各面有清晰的光影对比。
      */}
      <ambientLight intensity={0.55} color="#f0f0e8" />
      <directionalLight
        position={[6, 10, 4]}
        intensity={0.9}
        color="#fff8ee"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        position={[-3, 5, -4]}
        intensity={0.25}
        color="#c8d8e8"
      />

      {/* ===== 地面 ===== */}
      {/*
          一个半透明的圆形草地平面。
          分两层：下层略大为深色底，上层略小为草地色，
          产生一个自然的"地台"效果——等距视图中建筑仿佛坐落在一个微缩台面上。
      */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[5.5, 32]} />
        <meshStandardMaterial color={COLORS.terrain.grass} roughness={0.95} />
      </mesh>

      {/* ===== 接触阴影 ===== */}
      {/*
          ContactShadows 来自 drei 库，在建筑底部生成柔和的接触阴影。
          它模仿环境光遮蔽（AO）效果，让物体与地面接触处有自然的暗区。
      */}
      <ContactShadows
        position={[0, 0, 0]}
        opacity={0.35}
        scale={10}
        blur={2.5}
        far={4}
      />

      {/* ===== 主建筑 ===== */}
      <MainBuilding position={[0, 0, 0]} />

      {/* ===== 环境元素：树、路灯、石板路 ===== */}

      {/* 左侧樱花树 */}
      <Tree position={[-3.2, 0, 1.5]} seed="sakura-1" scale={1.1} />
      <Tree position={[-2.8, 0, -1.8]} seed="sakura-2" scale={0.95} />

      {/* 右侧梧桐树 */}
      <Tree position={[3.2, 0, 1.5]} seed="plane-1" scale={1.2} />
      <Tree position={[2.8, 0, -1.8]} seed="plane-2" scale={1.0} />

      {/* 建筑前侧樱花树 */}
      <Tree position={[-1.0, 0, 3.0]} seed="sakura-3" scale={0.85} />
      <Tree position={[1.2, 0, 3.2]} seed="sakura-4" scale={0.9} />

      {/* 校园路灯 */}
      <LampPost position={[-2.5, 0, 2.8]} />
      <LampPost position={[2.5, 0, 2.8]} />
      <LampPost position={[-2.8, 0, -2.5]} />
      <LampPost position={[2.8, 0, -2.5]} />

      {/* 石板路（从台阶延伸到场景前方） */}
      <StonePath position={[0, 0, 2.5]} length={2.5} width={1.2} />

      {/* 背面远树 */}
      <Tree position={[-4.0, 0, -2.5]} seed="bg-1" scale={1.3} />
      <Tree position={[4.0, 0, -2.5]} seed="bg-2" scale={1.4} />
    </>
  );
}
