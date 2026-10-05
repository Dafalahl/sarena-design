"use client"

import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button";

export default function LoginPage() {
    const handleGoogleLogin = async () => {
        const getURL = () => {
            let url = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
            url = url.endsWith('/') ? url : `${url}/`
            return url
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${getURL()}auth/callback`
            }
        })

        if (error) {
            console.error("Error logging in:", error.message)
        }
    }

    const handleDevLogin = async (roleType) => {
        // Set the bypass cookie (expires in 7 days)
        document.cookie = `sarena_dev_bypass=${roleType}; path=/; max-age=${60 * 60 * 24 * 7};`
        window.location.href = '/dashboard'
    }

    return (
      <div className="min-h-[75vh] flex items-center justify-center p-4 text-black select-none">
          <Card className="max-w-md w-full bg-white border-[3px] border-black rounded-none shadow-brutalist overflow-hidden relative">
              <CardHeader className="relative z-10 text-center pt-8 pb-4">
                  <div className="inline-block border border-black bg-slate-50 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider mx-auto mb-2 shadow-brutalist-sm">
                      SECURE ACCESS PORTAL
                  </div>
                  <CardTitle className="text-2xl font-black uppercase tracking-tight text-black">
                      Welcome to Sarena
                  </CardTitle>
                  <CardDescription className="text-slate-600 text-xs font-semibold mt-1">
                      Log in or sign up to continue
                  </CardDescription>
              </CardHeader>

              <CardContent className="relative z-10 text-center pb-8 px-6 space-y-6">
                  <button
                      onClick={handleGoogleLogin}
                      className="w-full h-11 border-2 border-black bg-white hover:bg-slate-50 text-black font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-3 shadow-brutalist-sm hover:shadow-brutalist hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-brutalist-sm transition-all cursor-pointer select-none"
                  >
                      <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                          <path
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                              fill="#4285F4"
                          />
                          <path
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                              fill="#34A853"
                          />
                          <path
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                              fill="#FBBC05"
                          />
                          <path
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                              fill="#EA4335"
                          />
                      </svg>
                      <span>Continue with Google</span>
                  </button>

                  {process.env.NODE_ENV === 'development' && (
                      <div className="pt-6 border-t-2 border-dashed border-black space-y-4">
                          <p className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest text-left">
                              Local Development Bypass
                          </p>
                          <div className="grid grid-cols-2 gap-4">
                              <Button
                                  variant="default"
                                  onClick={() => handleDevLogin('client')}
                                  className="w-full"
                              >
                                  Dev Client
                              </Button>
                              <Button
                                  variant="primary"
                                  onClick={() => handleDevLogin('creator')}
                                  className="w-full text-white"
                              >
                                  Dev Designer
                              </Button>
                          </div>
                      </div>
                  )}

                  <p className="text-[10px] text-slate-500 font-bold font-mono uppercase tracking-wider leading-relaxed pt-2">
                      By continuing, you agree to our <br /> Terms of Service and Privacy Policy.
                  </p>
              </CardContent>
          </Card>
      </div>
    )
}
