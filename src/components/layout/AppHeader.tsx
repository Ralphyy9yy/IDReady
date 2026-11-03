import { Check, CloudOff, Settings } from 'lucide-react'
import { Brand } from './Brand'

interface AppHeaderProps {
  offlineReady: boolean
  onHome: () => void
  onSettings: () => void
}

export function AppHeader({ offlineReady, onHome, onSettings }: AppHeaderProps) {
  return (
    <header className="app-header">
      <Brand onClick={onHome} />
      <div className="header-actions">
        <button className={`offline-pill ${offlineReady ? 'ready' : ''}`} onClick={onSettings}>
          <span>{offlineReady ? <Check /> : <CloudOff />}</span>
          {offlineReady ? 'Offline ready' : 'Offline setup'}
        </button>
        <button className="icon-button" onClick={onSettings} aria-label="Settings and help">
          <Settings />
        </button>
      </div>
    </header>
  )
}
