import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  // Membuat response bawaan dari Next.js
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Membuat client Supabase khusus untuk middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // WAJIB ADA: Baris ini yang akan "memancing" Supabase untuk mengecek 
  // apakah token expired, dan jika iya, langsung diperbarui (di-refresh) secara otomatis.
  await supabase.auth.getUser()

  return supabaseResponse
}

// Konfigurasi agar middleware berjalan di seluruh halaman, 
// KECUALI untuk file gambar, css, icon, dll agar website tetap cepat.
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}