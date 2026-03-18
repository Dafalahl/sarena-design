"use client"

import { useState } from 'react'
import Button from '@/components/Button'

export default function ProfileSetupPage() {
  const [loading, setLoading] = useState(false)

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    // Placeholder for profile save logic
    setTimeout(() => setLoading(false), 1000)
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Creator Profile Setup</h1>
        <p className="text-slate-400">Complete your profile to start accepting commission requests through Sarena Escrow.</p>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-8 glass p-8 rounded-3xl">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Display Name</label>
            <input 
              type="text" 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Your creative alias"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Bio / About</label>
            <textarea 
              rows={4}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="Tell buyers about your style, experience, and what you love to draw..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Portfolio Preview (Google Drive / ArtStation Link)</label>
            <input 
              type="url" 
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="https://"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Base Commission Rate (Rp)</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-slate-400">Rp</span>
              <input 
                type="number" 
                className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                placeholder="500000"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2">Sarena takes a 10% platform fee upon successful completion.</p>
          </div>
        </div>

        <div className="pt-6 border-t border-white/10 flex justify-end">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Saving...' : 'Publish Profile'}
          </Button>
        </div>
      </form>
    </div>
  )
}
