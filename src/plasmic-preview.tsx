import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PlasmicComponent, PlasmicRootProvider } from '@plasmicapp/loader-react'
import { PLASMIC } from './plasmic-init'

const root = document.getElementById('root')!

const componentName =
  (import.meta.env.VITE_PLASMIC_PREVIEW_COMPONENT as string | undefined) ??
  'Homepage'

const renderMessage = (message: string) => {
  createRoot(root).render(
    <StrictMode>
      <div style={{ padding: 16, fontFamily: 'system-ui' }}>{message}</div>
    </StrictMode>,
  )
}

if (!PLASMIC) {
  renderMessage(
    'Plasmic is not configured. Check .env.local values and restart `npm run dev`.',
  )
} else {
  try {
    const data = await PLASMIC.fetchComponentData(componentName)
    createRoot(root).render(
      <StrictMode>
        <PlasmicRootProvider loader={PLASMIC} prefetchedData={data}>
          <PlasmicComponent component={componentName} />
        </PlasmicRootProvider>
      </StrictMode>,
    )
  } catch (error) {
    console.error(error)
    renderMessage(
      `Failed to load Plasmic component "${componentName}". Check the component name and your .env.local settings.`,
    )
  }
}
