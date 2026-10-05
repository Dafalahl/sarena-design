import { createBrowserClient } from '@supabase/ssr'

const rawClient = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    global: {
      headers: {
        'Cache-Control': 'no-store'
      }
    }
  }
)

export const supabase = new Proxy(rawClient, {
  get(target, prop) {
    if (prop === 'auth' && process.env.NODE_ENV === 'development') {
      const getCookie = (name) => {
        if (typeof document === 'undefined') return null
        const value = `; ${document.cookie}`
        const parts = value.split(`; ${name}=`)
        if (parts.length === 2) return parts.pop().split(';').shift()
        return null
      }
      const bypass = getCookie('sarena_dev_bypass')
      if (bypass) {
        const mockUser = {
          id: bypass === 'creator' ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001',
          email: bypass === 'creator' ? 'designer@example.com' : 'client@example.com',
          user_metadata: {
             full_name: bypass === 'creator' ? 'Test Designer' : 'Test Client',
             avatar_url: bypass === 'creator' ? 'https://api.dicebear.com/7.x/adventurer/svg?seed=testdesigner' : 'https://api.dicebear.com/7.x/adventurer/svg?seed=testclient'
          }
        }
        return {
          ...target.auth,
          getUser: async () => ({ data: { user: mockUser }, error: null }),
          getSession: async () => ({ data: { session: { user: mockUser } }, error: null }),
          onAuthStateChange: (callback) => {
            // Fast refresh or initial render will trigger callback
            setTimeout(() => {
              callback('SIGNED_IN', { user: mockUser })
            }, 0)
            return { data: { subscription: { unsubscribe: () => {} } } }
          },
          signOut: async () => {
            document.cookie = 'sarena_dev_bypass=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;'
            window.location.href = '/login'
            return { error: null }
          }
        }
      }
    }
    return target[prop]
  }
})
