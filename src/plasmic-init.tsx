import { PLASMIC } from './plasmic-loader'

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
