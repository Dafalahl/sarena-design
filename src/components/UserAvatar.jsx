'use client'

import { useState, useEffect } from 'react'

export default function UserAvatar({ src, name, email, className = "w-8 h-8", imageClassName = "" }) {
  const [prevSrc, setPrevSrc] = useState(src)
  const [hasError, setHasError] = useState(false)

  if (src !== prevSrc) {
    setPrevSrc(src)
    setHasError(false)
  }

  // Clear potential invalid url string values
  const cleanSrc = typeof src === 'string' ? src.trim() : null
  const isValidSrc = cleanSrc && 
                     cleanSrc !== '' && 
                     cleanSrc !== 'null' && 
                     cleanSrc !== 'undefined' && 
                     !cleanSrc.includes('/undefined') && 
                     !cleanSrc.includes('/null') &&
                     !cleanSrc.startsWith('https://api.dicebear.com/')

  const displayName = name || email || 'User'
  const firstLetter = displayName.trim().charAt(0).toUpperCase() || 'U'

  // Dynamic background color based on name/email hash
  const getAvatarColorClass = (str) => {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const colors = [
      'bg-accent-lime text-black border border-black',
      'bg-accent-purple text-white border border-black',
      'bg-accent-orange text-black border border-black',
      'bg-accent-yellow text-black border border-black',
      'bg-accent-blue text-black border border-black',
      'bg-pink-500 text-white border border-black',
      'bg-emerald-500 text-white border border-black',
      'bg-red-500 text-white border border-black',
      'bg-blue-600 text-white border border-black',
    ]
    return colors[Math.abs(hash) % colors.length]
  }

  const bgClass = getAvatarColorClass(displayName)

  // Strip existing bg- class names from the incoming className to prevent conflicts
  const cleanClassName = className.replace(/\bbg-\S+/g, '')

  if (isValidSrc && !hasError) {
    return (
      <div className={`${cleanClassName} overflow-hidden flex-shrink-0 flex items-center justify-center bg-zinc-100`}>
        <img 
          src={cleanSrc} 
          alt={displayName} 
          onError={() => setHasError(true)}
          className={`${imageClassName} w-full h-full object-cover`}
        />
      </div>
    )
  }

  return (
    <div className={`${cleanClassName} ${bgClass} flex-shrink-0 flex items-center justify-center font-bold text-xs uppercase select-none`}>
      {firstLetter}
    </div>
  )
}
