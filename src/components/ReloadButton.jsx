'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useState } from 'react'

export default function ReloadButton({ onClick }) {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    if (onClick) {
      await onClick()
    } else {
      router.refresh()
    }
    setTimeout(() => setRefreshing(false), 800)
  }

  return (
    <Button
      onClick={handleRefresh}
      disabled={refreshing}
      variant="outline"
      size="sm"
      className="h-8 w-8 p-0 border-2 border-black rounded-none shadow-brutalist-xs bg-white text-black hover:bg-slate-50 shrink-0 flex items-center justify-center"
      aria-label="Reload"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
    </Button>
  )
}
