import { Canvas } from "@react-three/fiber";
import CampusScene from "./components/CampusScene";
import "./App.css";

/**
 * App — 校园 2.5D 场景入口。
 * <Canvas> 创建 WebGL 渲染上下文，dpr 自动适配像素比。
 */
export default function App() {
  return (
    <div className="app-container">
      <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
        <CampusScene />
      </Canvas>
      <div className="ui-overlay">
        <h1>珞珈校园</h1>
        <p className="subtitle">Luo Jia Campus</p>
      </div>
    </div>
  );
}
