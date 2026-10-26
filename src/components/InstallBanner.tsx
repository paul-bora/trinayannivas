import { useEffect, useState } from 'react'
import { readLocal, writeLocal } from '../lib/local'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
}

// Chrome fires this early, often before React mounts, so it is captured at import time.
let deferredPrompt: InstallPromptEvent | null = null
const listeners = new Set<() => void>()
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e as InstallPromptEvent
  listeners.forEach((l) => l())
})

function isInstalled() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

// Explains how to add the app to the home screen, until installed or dismissed.
export default function InstallBanner() {
  const [hidden, setHidden] = useState(() => isInstalled() || readLocal('install-banner-hidden') === '1')
  const [canPrompt, setCanPrompt] = useState(Boolean(deferredPrompt))

  useEffect(() => {
    const update = () => setCanPrompt(Boolean(deferredPrompt))
    listeners.add(update)
    return () => {
      listeners.delete(update)
    }
  }, [])

  if (hidden) return null

  const dismiss = () => {
    writeLocal('install-banner-hidden', '1')
    setHidden(true)
  }
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)

  return (
    <div className="card install">
      <strong>Install the app</strong>
      {canPrompt ? (
        <p>Add Trinayan Nivas to your home screen for one-tap access.</p>
      ) : isIos ? (
        <p>
          In Safari, tap <b>Share</b> (the square with an arrow), then <b>Add to Home Screen</b>.
        </p>
      ) : (
        <p>
          Open your browser menu (⋮) and tap <b>Install app</b> or <b>Add to Home screen</b>.
        </p>
      )}
      <div className="row gap">
        {canPrompt && (
          <button
            className="btn small"
            onClick={async () => {
              await deferredPrompt?.prompt()
              deferredPrompt = null
              dismiss()
            }}
          >
            Install
          </button>
        )}
        <button className="btn small ghost" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  )
}
