'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

function ProgressBarContent() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const timerRef = useRef(null)

  // Smooth finish transition when pathname/searchParams update
  useEffect(() => {
    setProgress((prev) => {
      if (prev > 0) {
        return 100
      }
      return 0
    })

    const hideTimer = setTimeout(() => {
      setProgress(0)
    }, 250)

    return () => clearTimeout(hideTimer)
  }, [pathname, searchParams])

  useEffect(() => {
    const startProgress = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setProgress(15)
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            if (timerRef.current) clearInterval(timerRef.current)
            return 90
          }
          return prev + 5
        })
      }, 150)
    }

    const originalPushState = window.history.pushState
    window.history.pushState = function (...args) {
      // Defer state update to avoid 'useInsertionEffect must not schedule updates' error
      setTimeout(startProgress, 0)
      return originalPushState.apply(this, args)
    }

    const originalReplaceState = window.history.replaceState
    window.history.replaceState = function (...args) {
      // Defer state update to avoid 'useInsertionEffect must not schedule updates' error
      setTimeout(startProgress, 0)
      return originalReplaceState.apply(this, args)
    }

    return () => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 h-1.5 bg-accent-lime border-b border-black z-[9999] transition-all duration-200 ease-out"
      style={{ width: `${progress}%` }}
    />
  )
}

export default function TopProgressBar() {
  return (
    <Suspense fallback={null}>
      <ProgressBarContent />
    </Suspense>
  )
}
