import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PlasmicCanvasHost } from '@plasmicapp/loader-react'
import { PLASMIC } from './plasmic-loader'
import './plasmic-init'

const root = document.getElementById('root')!

createRoot(root).render(
  <StrictMode>
    {PLASMIC ? (
      <PlasmicCanvasHost />
    ) : (
      <div style={{ padding: 16, fontFamily: 'system-ui' }}>
        Plasmic is not configured. Check .env.local values and restart `npm run dev`.
      </div>
    )}
  </StrictMode>,
)
