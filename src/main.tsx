import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ThreeDScene from './ThreeDScene.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThreeDScene />
  </StrictMode>,
)
