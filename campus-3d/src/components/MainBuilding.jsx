import { COLORS, GEOMETRY } from "../constants/colors";
import Roof from "./Roof";
import Tower from "./Tower";
import Stairs from "./Stairs";
import Balcony from "./Balcony";
import ArchedWindow from "./ArchedWindow";
import Pillar from "./Pillar";

/**
 * MainBuilding — 主建筑体。
 *
 * 整个建筑的核心组合：
 * — 米黄色石材基座（底部抬高 + 正面台阶）
 * — 红砖主体墙面（带拱窗序列）
 * — 青灰色多层坡屋顶
 * — 中央塔楼/钟楼
 * — 柱廊门廊
 * — 二层露台 + 栏杆
 *
 * 所有元素用基础几何体堆叠，没有贴图，靠flatShading产生手绘感。
 * 等距视角下，体积感来自前后左右面的颜色区分。
 */
export default function MainBuilding({ position = [0, 0, 0] }) {
  const W = GEOMETRY.building.width;       // 6
  const D = GEOMETRY.building.depth;        // 4
  const H = GEOMETRY.building.wallHeight;   // 3
  const BH = GEOMETRY.base.height;          // 0.5

  // 正面拱窗位置：左右各两扇，在基座上方
  const windows = [
    { x: -2.0 },
    { x: -1.0 },
    { x: 1.0 },
    { x: 2.0 },
  ];

  return (
    <group position={position}>
      {/* ===== 石材基座 ===== */}
      <mesh position={[0, BH / 2, 0]}>
        <boxGeometry args={[W + 0.6, BH, D + 0.6]} />
        <meshStandardMaterial color={COLORS.base.mid} roughness={0.9} flatShading />
      </mesh>
      {/* 基座顶部收边 */}
      <mesh position={[0, BH, 0]}>
        <boxGeometry args={[W + 0.4, 0.06, D + 0.4]} />
        <meshStandardMaterial color={COLORS.base.top} roughness={0.9} />
      </mesh>

      {/* ===== 正面石台阶 ===== */}
      <Stairs count={5} width={2.4} position={[0, BH, D / 2 + 0.2]} />

      {/* ===== 红砖主体墙面 ===== */}
      <mesh position={[0, BH + H / 2, 0]}>
        <boxGeometry args={[W, H, D]} />
        <meshStandardMaterial color={COLORS.wall.brick} roughness={0.85} flatShading />
      </mesh>

      {/* 墙面横向线脚装饰 */}
      <mesh position={[0, BH + H * 0.65, 0]}>
        <boxGeometry args={[W + 0.05, 0.06, D + 0.05]} />
        <meshStandardMaterial color={COLORS.wall.trim} roughness={0.8} />
      </mesh>
      <mesh position={[0, BH + H * 0.35, 0]}>
        <boxGeometry args={[W + 0.05, 0.06, D + 0.05]} />
        <meshStandardMaterial color={COLORS.wall.trim} roughness={0.8} />
      </mesh>

      {/* ===== 正面拱形窗 ===== */}
      {windows.map((w, i) => (
        <ArchedWindow
          key={i}
          position={[w.x, BH + 1.4, D / 2 + 0.01]}
        />
      ))}

      {/* ===== 侧面拱形窗 ===== */}
      {windows.slice(0, 3).map((w, i) => (
        <ArchedWindow
          key={`s${i}`}
          position={[W / 2 + 0.01, BH + 1.4, -1.0 + i * 1.0]}
          rotation={[0, Math.PI / 2, 0]}
        />
      ))}

      {/* ===== 入口门廊柱列 ===== */}
      {[-0.6, 0.6].map((x, i) => (
        <Pillar
          key={i}
          position={[x, BH, D / 2 + 0.1]}
          height={2.0}
        />
      ))}
      {/* 门廊顶 */}
      <mesh position={[0, BH + 2.0, D / 2 + 0.1]}>
        <boxGeometry args={[2.0, 0.1, 0.8]} />
        <meshStandardMaterial color={COLORS.wall.trim} roughness={0.8} />
      </mesh>

      {/* ===== 中央入口拱门 ===== */}
      <ArchedWindow
        position={[0, BH + 0.9, D / 2 + 0.01]}
        width={0.8}
        height={1.4}
        archHeight={0.4}
        depth={0.1}
      />

      {/* ===== 二层露台（入口上方） ===== */}
      <Balcony
        width={2.4}
        depth={0.5}
        position={[0, BH + 2.2, D / 2 - 0.1]}
      />

      {/* ===== 青灰色坡屋顶 ===== */}
      <Roof width={W} depth={D} overhang={0.6} baseY={BH + H} />

      {/* ===== 中央钟楼 ===== */}
      <Tower position={[0, BH + H, 0]} width={1.8} depth={1.8} />

      {/* ===== 屋顶四角装饰小尖塔 ===== */}
      {[
        [-1, 1],
        [1, 1],
        [-1, -1],
        [1, -1],
      ].map(([sx, sz], i) => (
        <group key={i} position={[sx * (W / 2 - 0.2), BH + H + 1.2, sz * (D / 2 - 0.2)]}>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.08, 0.5, 0.08]} />
            <meshStandardMaterial color={COLORS.accent.copper} roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <coneGeometry args={[0.08, 0.15, 4]} />
            <meshStandardMaterial color={COLORS.accent.gold} roughness={0.5} metalness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
