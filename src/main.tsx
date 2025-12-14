import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './styles/themes.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Toaster
      position="top-right"
      theme="dark"
      toastOptions={{
        classNames: {
          toast: 'bg-card text-foreground border border-border shadow-lg',
          description: 'text-muted-foreground',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-secondary text-secondary-foreground',
        },
      }}
    />
  </StrictMode>,
)
