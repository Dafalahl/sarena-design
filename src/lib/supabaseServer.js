import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  const bypass = cookieStore.get('sarena_dev_bypass')?.value

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Unnecessary for server components, mostly for middleware/actions.
          }
        },
      },
    }
  )

  if (process.env.NODE_ENV === 'development' && bypass) {
    const mockUser = {
      id: bypass === 'creator' ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001',
      email: bypass === 'creator' ? 'designer@example.com' : 'client@example.com',
      user_metadata: {
         full_name: bypass === 'creator' ? 'Test Designer' : 'Test Client',
         avatar_url: bypass === 'creator' ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=testdesigner' : 'https://api.dicebear.com/7.x/adventurer/svg?seed=testclient'
      }
    }
    
    client.auth = new Proxy(client.auth, {
      get(target, prop) {
        if (prop === 'getUser') {
          return async () => ({ data: { user: mockUser }, error: null })
        }
        if (prop === 'getSession') {
          return async () => ({ data: { session: { user: mockUser } }, error: null })
        }
        return target[prop]
      }
    })
  }

  return client
}
