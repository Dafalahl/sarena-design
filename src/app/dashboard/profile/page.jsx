'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default function ProfileSetupPage() {
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const router = useRouter()

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle()
        
        if (data) {
          setIsEditing(true)
          // Prefill form by updating input values via DOM 
          // (Since we are using uncontrolled inputs via FormData, we can set defaultValues)
          setTimeout(() => {
            if (document.getElementById('displayName')) document.getElementById('displayName').value = data.username || ''
            if (document.getElementById('bio')) document.getElementById('bio').value = data.bio || ''
            if (document.getElementById('portfolio')) document.getElementById('portfolio').value = data.portfolio_url || ''
            if (document.getElementById('rate')) document.getElementById('rate').value = data.price_base || ''
          }, 0)
        }
      }
      setInitialLoading(false)
    }
    loadProfile()
  }, [])

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    // Get form data
    const formData = new FormData(e.target)
    const username = formData.get('displayName')
    const bio = formData.get('bio')
    const portfolio_url = formData.get('portfolio')
    const price_base = formData.get('rate')
    
    // Get current user session securely
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      setError("Failed to authenticate. Please login again.")
      setLoading(false)
      return
    }

    const userId = user.id

    // 1. Insert into profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        username,
        bio,
        portfolio_url,
        price_base: price_base ? parseInt(price_base) : 0,
        is_verified: false,
      }, { onConflict: 'id' })

    if (profileError) {
      setError(profileError.message)
      setLoading(false)
      return
    }

    // 2. Update role in users table to 'creator'
    const { error: userError } = await supabase
      .from('users')
      .update({ role: 'creator' })
      .eq('id', userId)
      
    if (userError) {
      setError(userError.message)
      setLoading(false)
      return
    }

    setLoading(false)
    router.refresh()
    router.push('/dashboard')
  }

  if (initialLoading) {
    return <div className="text-center py-24 text-slate-400">Loading your profile data...</div>
  }

  return (
    <div className="max-w-3xl mx-auto py-12">
      <div className="mb-10 text-center md:text-left">
        <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-rose-400 mb-3">
          {isEditing ? 'Edit Creator Profile' : 'Creator Profile Setup'}
        </h1>
        <p className="text-slate-400 text-lg">
          {isEditing ? 'Update your profile information and commission rates here.' : 'Complete your profile to start accepting commission requests through Sarena Escrow.'}
        </p>
      </div>

      <Card className="glass rounded-3xl border-white/10 shadow-2xl bg-slate-900/40 backdrop-blur-xl overflow-hidden">
        <CardHeader className="border-b border-white/5 bg-white/[0.02] p-8">
          <CardTitle className="text-xl text-white">Profile Information</CardTitle>
          <CardDescription>This information will be visible to potential buyers.</CardDescription>
        </CardHeader>

        <CardContent className="p-8">
          <form onSubmit={handleSaveProfile} className="space-y-8">
            <div className="grid gap-8">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm mb-6">
                  {error}
                </div>
              )}
              <div className="space-y-3">
                <Label htmlFor="displayName" className="text-slate-200 text-base">Display Name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  type="text"
                  required
                  className="bg-slate-900/50 border-white/10 rounded-xl h-12 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Your creative alias (e.g. Alex Designs)"
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="bio" className="text-slate-200 text-base">Bio / About</Label>
                <Textarea
                  id="bio"
                  name="bio"
                  rows={5}
                  required
                  className="bg-slate-900/50 border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 transition-all min-h-[120px] resize-none"
                  placeholder="Tell buyers about your style, experience, and what you love to create..."
                />
              </div>

              <div className="space-y-3">
                <Label htmlFor="portfolio" className="text-slate-200 text-base">Portfolio Preview Link</Label>
                <Input
                  id="portfolio"
                  name="portfolio"
                  type="url"
                  required
                  className="bg-slate-900/50 border-white/10 rounded-xl h-12 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="Link to Google Drive, ArtStation, or Behance"
                />
                <p className="text-xs text-slate-500">Provide a link where buyers can see more of your work.</p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="rate" className="text-slate-200 text-base">Base Commission Rate (IDR)</Label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400 font-medium">Rp</span>
                  <Input
                    id="rate"
                    name="rate"
                    type="number"
                    required
                    min="10000"
                    step="10000"
                    className="bg-slate-900/50 border-white/10 rounded-xl h-12 pl-12 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 transition-all"
                    placeholder="500000"
                  />
                </div>
                <p className="text-xs text-slate-500 italic mt-2">
                  * Sarena takes a fixed 10% platform fee upon successful completion.
                </p>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 flex flex-col sm:flex-row gap-4 justify-end">
              <Button type="button" variant="secondary" className="px-8 rounded-xl h-12" onClick={() => router.push('/dashboard')}>
                Cancel
              </Button>
              <Button type="submit" variant="gradient" className="px-10 rounded-xl h-12 font-bold shadow-lg shadow-indigo-500/20" disabled={loading}>
                {loading ? 'Saving...' : (isEditing ? 'Update Profile' : 'Publish Profile')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
