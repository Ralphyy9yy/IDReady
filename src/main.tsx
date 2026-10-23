import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './styles/app.css'
import './styles/polish.css'
import './styles/export.css'
import './styles/camera.css'
import './styles/processing.css'
import './styles/enhancements.css'
registerSW({ immediate: true })
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>)
