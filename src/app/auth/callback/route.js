import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabaseServer'

export async function GET(request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  
  // Reliably get the real Vercel production URL from headers
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  let origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestUrl.origin
  
  // Ensure the origin does not have a trailing slash for redirects
  origin = origin.endsWith('/') ? origin.slice(0, -1) : origin
  
  if (code) {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session) {
      // 1. Get user metadata from Google OAuth Profile
      const { user } = session
      const metadata = user.user_metadata || {}
      
      const avatarUrl = metadata.avatar_url || metadata.picture || null
      const fullName = metadata.full_name || metadata.name || null
      const usernameFromGoogle = metadata.preferred_username || metadata.name?.replace(/\s+/g, '').toLowerCase() || `user_${user.id.substring(0,8)}`

      // 2. We don't necessarily need to upsert here because we have a Supabase Auth Trigger
      // that inserts into public.users automatically.
      // However, we can update the user's avatar_url and full_name just in case it changed.
      if (user.id) {
        const { error: upsertError } = await supabase
          .from('users')
          .update({
            avatar_url: avatarUrl,
            full_name: fullName,
          })
          .eq('id', user.id)

        if (upsertError) {
          console.error("Error updating user details:", upsertError.message)
        }
      }

 
      return NextResponse.redirect(`${origin}/account`)
    } else if (error) {
      console.error("Auth callback exchange error:", error.message)
      return NextResponse.redirect(`${origin}/login?error=auth-failed&reason=${encodeURIComponent(error.message)}`)
    }
  }

  // Return to login if something failed without an error message
  return NextResponse.redirect(`${origin}/login?error=no-code`)
}
