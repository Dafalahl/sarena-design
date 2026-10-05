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
  const router = useRouter()
  
  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [isEditing, setIsEditing] = useState(false)

  // Form states (controlled inputs)
  const [displayName, setDisplayName] = useState('')
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [portfolio, setPortfolio] = useState('')
  const [rate, setRate] = useState('')
  const [role, setRole] = useState('client')

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()
          
          if (data) {
            setDisplayName(data.full_name || '')
            setUsername(data.username || '')
            setBio(data.bio || '')
            setPortfolio(data.portfolio_url || '')
            setRate(data.price_base ? String(data.price_base) : '')
            setRole(data.role || 'client')
            
            if (data.username) {
              setIsEditing(true)
            }
          }
        }
      } catch (err) {
        console.error("Failed to load profile:", err)
        setError("Failed to load profile details.")
      } finally {
        setInitialLoading(false)
      }
    }
    loadProfile()
  }, [])

  const handleUsernameChange = (e) => {
    const raw = e.target.value
    // Enforce lowercase, alphanumeric and dashes/underscores only
    const clean = raw.toLowerCase().replace(/[^a-z0-9_-]/g, '')
    setUsername(clean)
  }

  const formatRupiah = (val) => {
    if (!val) return 'Rp 0'
    const num = parseInt(val, 10)
    if (isNaN(num)) return 'Rp 0'
    return 'Rp ' + num.toLocaleString('id-ID')
  }

  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    if (!displayName.trim()) {
      setError("Display Name is required.")
      setLoading(false)
      return
    }

    if (!username.trim()) {
      setError("Username is required.")
      setLoading(false)
      return
    }
    
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        throw new Error("Failed to authenticate. Please login again.")
      }

      // Update users table
      const { error: userError } = await supabase
        .from('users')
        .update({
          full_name: displayName.trim(),
          username: username.trim(),
          bio: bio.trim() || null,
          portfolio_url: role === 'creator' ? (portfolio.trim() || null) : null,
          price_base: role === 'creator' ? (rate ? parseInt(rate, 10) : 0) : 0,
          role: role || 'client',
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        
      if (userError) {
        // PostgrestError duplicate key code is 23505
        if (userError.code === '23505') {
          setError("This username is already taken. Please choose another one.")
        } else {
          setError(userError.message || "Failed to update profile.")
        }
        setLoading(false)
        return
      }

      setLoading(false)
      router.refresh()
      router.push('/dashboard')
    } catch (err) {
      console.error(err)
      setError(err.message || "Failed to save profile.")
      setLoading(false)
    }
  }

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="font-mono text-xs font-bold uppercase tracking-widest animate-pulse text-black">
          Loading creator registry profile...
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-black select-none">
      <div className="mb-6 text-left">
        <div className="inline-block border border-black bg-white px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mb-2 shadow-brutalist-sm">
          {role === 'creator' 
            ? (isEditing ? 'EDIT CREATOR IDENTITY' : 'CREATOR ONBOARDING') 
            : (isEditing ? 'EDIT ACCOUNT PROFILE' : 'ACCOUNT ONBOARDING')}
        </div>
        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight">
          {role === 'creator' 
            ? (isEditing ? 'Edit Creator Profile' : 'Creator Profile Setup')
            : (isEditing ? 'Edit Profil Akun' : 'Pengaturan Profil Akun')}
        </h1>
        <p className="text-slate-600 text-xs font-semibold mt-1 leading-relaxed">
          {role === 'creator'
            ? (isEditing 
                ? 'Perbarui alias publik, bio portofolio, dan tarif dasar layanan Anda.' 
                : 'Lengkapi profil kreator Anda untuk mulai menerima pesanan dan proyek kolaborasi.')
            : (isEditing
                ? 'Kelola identitas akun dan informasi profil Anda di platform Sarena.'
                : 'Lengkapi profil akun Anda untuk mulai menjelajahi talenta dan membuat workspace.')}
        </p>
      </div>

      <Card className="bg-white border-[3px] border-black rounded-none shadow-brutalist overflow-hidden relative">
        <CardHeader className="relative z-10 border-b-2 border-black bg-slate-50 p-5 md:p-6">
          <CardTitle className="text-lg font-black uppercase tracking-wide">
            Profile Settings
          </CardTitle>
          <CardDescription className="text-slate-600 text-xs font-semibold mt-0.5">
            Atur informasi identitas akun Anda di seluruh ekosistem Sarena.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5 md:p-6 relative z-10">
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {error && (
              <div className="border-2 border-black bg-accent-orange p-3 text-xs font-bold uppercase tracking-wide font-mono">
                {error}
              </div>
            )}

            {/* Role Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-wider block">Pilih Peran Akun</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('client')}
                  className={`p-3 border-2 text-left transition-all cursor-pointer ${
                    role === 'client'
                      ? 'bg-accent-lime text-black border-black shadow-brutalist-sm font-black'
                      : 'bg-white text-slate-600 border-black/40 hover:border-black font-semibold'
                  }`}
                >
                  <p className="text-xs uppercase text-black font-black">Saya Klien</p>
                  <p className="text-[10px] font-mono lowercase text-slate-600 font-normal mt-0.5">Ingin menyewa desainer</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('creator')}
                  className={`p-3 border-2 text-left transition-all cursor-pointer ${
                    role === 'creator'
                      ? 'bg-accent-purple text-white border-black shadow-brutalist-sm font-black'
                      : 'bg-white text-slate-600 border-black/40 hover:border-black font-semibold'
                  }`}
                >
                  <p className="text-xs uppercase text-black font-black">Saya Desainer</p>
                  <p className="text-[10px] font-mono lowercase text-slate-600 font-normal mt-0.5">Ingin menawarkan jasa</p>
                </button>
              </div>
            </div>

            {/* Display Name (Required) */}
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-xs font-black uppercase tracking-wider block">Display Name</Label>
              <Input
                id="displayName"
                name="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Designs"
                className="font-bold border-2 border-black rounded-none"
              />
            </div>

            {/* Username (Required) */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-xs font-black uppercase tracking-wider block">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                required
                value={username}
                onChange={handleUsernameChange}
                placeholder="e.g. alexdesigns"
                className="font-mono font-bold border-2 border-black rounded-none"
              />
              <p className="text-[10px] text-slate-500 font-mono mt-1 leading-relaxed">
                Your portfolio path: <span className="text-accent-purple font-bold">https://sarenadesign.com/@{username || 'username'}</span>
              </p>
            </div>

            {/* Bio (Optional) */}
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-xs font-black uppercase tracking-wider block">Bio / About (Optional)</Label>
              <Textarea
                id="bio"
                name="bio"
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell clients about your design style, software specialties, and what you love to create..."
                className="resize-none border-2 border-black rounded-none"
              />
            </div>

            {/* Creator-Specific Fields (Portfolio & Rate) */}
            {role === 'creator' ? (
              <>
                {/* Portfolio URL (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="portfolio" className="text-xs font-black uppercase tracking-wider block">Portfolio Link (Optional)</Label>
                  <Input
                    id="portfolio"
                    name="portfolio"
                    type="url"
                    value={portfolio}
                    onChange={(e) => setPortfolio(e.target.value)}
                    placeholder="e.g. https://behance.net/alexdesigns"
                    className="font-mono border-2 border-black rounded-none"
                  />
                </div>

                {/* Base Commission Rate (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="rate" className="text-xs font-black uppercase tracking-wider block">Base Commission Rate</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-black font-bold font-mono text-sm">Rp</span>
                    <Input
                      id="rate"
                      name="rate"
                      type="number"
                      min="10000"
                      step="10000"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      placeholder="500000"
                      className="pl-10 font-mono font-bold border-2 border-black rounded-none"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-1 flex flex-wrap items-center gap-1.5 leading-relaxed">
                    Formatted: <span className="text-black bg-accent-lime px-2 py-0.5 border border-black font-bold shadow-brutalist-xs">{formatRupiah(rate)}</span>
                  </p>
                </div>
              </>
            ) : (
              <div className="p-3 bg-slate-50 border border-black font-mono text-[11px] text-slate-700 shadow-brutalist-xs">
                💡 Sebagai <strong>Klien</strong>, Anda cukup mengisi Nama & Username. Anda dapat langsung merekrut desainer via Escrow setelah profil disimpan.
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-4 border-t-2 border-dashed border-black flex flex-col sm:flex-row gap-3 justify-end">
              {isEditing && (
                <Button 
                  type="button" 
                  variant="secondary" 
                  className="h-11 border-2 border-black rounded-none bg-white text-black font-black uppercase tracking-wider shadow-brutalist-sm hover:-translate-y-[1px] hover:shadow-brutalist transition-all" 
                  onClick={() => router.push('/dashboard')}
                >
                  Cancel
                </Button>
              )}
              <Button 
                type="submit" 
                disabled={loading}
                className="h-11 border-2 border-black rounded-none bg-accent-lime text-black font-black uppercase tracking-wider shadow-brutalist-sm hover:-translate-y-[1px] hover:shadow-brutalist transition-all"
              >
                {loading ? 'Saving...' : (isEditing ? 'Update Profile' : 'Complete Onboarding')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
