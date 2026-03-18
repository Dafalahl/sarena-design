import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session) {
      // 1. Get user metadata from Google OAuth Profile
      const { user } = session
      const metadata = user.user_metadata || {}
      
      const avatarUrl = metadata.avatar_url || metadata.picture || null
      const fullName = metadata.full_name || metadata.name || null
      const usernameFromGoogle = metadata.preferred_username || metadata.name?.replace(/\s+/g, '').toLowerCase() || \`user_\${user.id.substring(0,8)}\`

      // 2. Upsert profile into public.users table
      // Note: A database trigger is often cleaner, but this explicitly fulfills the request via Next.js backend.
      if (user.id) {
        const { error: upsertError } = await supabase
          .from('users')
          .upsert({
            id: user.id, // Primary Key linked to auth.users
            avatar_url: avatarUrl,
            full_name: fullName,
            username: usernameFromGoogle,
            email: user.email,
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' })

        if (upsertError) {
          console.error("Error upserting user profile:", upsertError.message)
        }
      }

      // Redirect to dashboard (or wherever) after successful login
      return NextResponse.redirect(\`\${origin}/dashboard\`)
    }
  }

  // Return to login if something failed
  return NextResponse.redirect(\`\${origin}/login?error=auth-failed\`)
}
