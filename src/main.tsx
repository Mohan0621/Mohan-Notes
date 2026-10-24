import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { initBrowserStorageFallback } from './utils/storageAdapter'
import './index.css'

initBrowserStorageFallback()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

window.electronAPI?.getVersion().then((v) => {
  console.log(`GoodNotes v${v} — IPC bridge active`)
})
