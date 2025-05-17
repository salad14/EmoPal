import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 移除StrictMode以避免在开发环境中组件重复挂载和卸载
// 这有助于解决Three.js模型加载过程中的竞态条件
createRoot(document.getElementById('root')!).render(
  <App />
)
