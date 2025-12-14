import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PlasmicComponent, PlasmicRootProvider } from '@plasmicapp/loader-react'
import { PLASMIC } from './plasmic-init'

const root = document.getElementById('root')!
const reactRoot = createRoot(root)

const renderMessage = (message: string) => {
  reactRoot.render(
    <StrictMode>
      <div style={{ padding: 16, fontFamily: 'system-ui' }}>{message}</div>
    </StrictMode>,
  )
}

;(async () => {
  if (!PLASMIC) {
    renderMessage(
      'Plasmic is not configured. Check .env.local values and restart `npm run dev`.',
    )
    return
  }

  try {
    const prefetched = await PLASMIC.fetchComponentData('Homepage')
    reactRoot.render(
      <StrictMode>
        <PlasmicRootProvider loader={PLASMIC} prefetchedData={prefetched}>
          <PlasmicComponent component="Homepage" />
        </PlasmicRootProvider>
      </StrictMode>,
    )
  } catch (error) {
    console.error(error)
    renderMessage(
      'Failed to load Plasmic component "Homepage". Check your .env.local settings and restart `npm run dev`.',
    )
  }
})()
