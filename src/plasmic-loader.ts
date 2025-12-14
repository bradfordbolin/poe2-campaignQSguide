import { initPlasmicLoader } from '@plasmicapp/loader-react'

const projectId = import.meta.env.VITE_PLASMIC_PROJECT_ID as string | undefined

// Pick ONE token env var name and use it everywhere.
// If you already set VITE_PLASMIC_API_TOKEN in .env.local, keep this:
const token = import.meta.env.VITE_PLASMIC_API_TOKEN as string | undefined

export const PLASMIC =
  projectId && token
    ? initPlasmicLoader({
        projects: [{ id: projectId, token }],
      })
    : null
