import { createClient } from '@/lib/supabaseServer'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch user data from the core users table created by our trigger
  const { data: userData } = await supabase
    .from('users')
    .select('full_name, role, username')
    .eq('id', user.id)
    .single()

  if (userData && !userData.username) {
    redirect('/account')
  }

  // Fetch workspaces related to this user
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select(`
      *,
      client:users!client_id (full_name),
      creator:users!creator_id (full_name)
    `)
    .or(`client_id.eq.${user.id},creator_id.eq.${user.id},created_by.eq.${user.id}`)
    .order('created_at', { ascending: false })

  const validWorkspaces = workspaces || []

  return (
    <DashboardClient
      user={user}
      userData={userData}
      initialWorkspaces={validWorkspaces}
    />
  )
}
