import { initPlasmicLoader } from '@plasmicapp/loader-react'

const projectId = import.meta.env.VITE_PLASMIC_PROJECT_ID as string | undefined
const apiToken = import.meta.env.VITE_PLASMIC_API_TOKEN as string | undefined

export const PLASMIC =
  projectId && apiToken
    ? initPlasmicLoader({
        projects: [{ id: projectId, token: apiToken }],
      })
    : null

type HelloWorldProps = {
  text?: string
}

export function HelloWorld({ text = 'Hello from Plasmic!' }: HelloWorldProps) {
  return (
    <div
      style={{
        padding: 12,
        border: '1px solid #ccc',
        borderRadius: 8,
        fontFamily: 'system-ui',
      }}
    >
      {text}
    </div>
  )
}

if (PLASMIC) {
  PLASMIC.registerComponent(HelloWorld, {
    name: 'HelloWorld',
    props: {
      text: {
        type: 'string',
        defaultValue: 'Hello from Plasmic!',
      },
    },
  })
}
