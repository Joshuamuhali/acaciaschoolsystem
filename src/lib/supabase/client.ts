// ------------------------------
// Supabase Env Debug in Vite
// ------------------------------

console.group('🌐 Supabase Environment Debug')

// 1️⃣ Check if .env is likely loaded
const hasSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const hasSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

console.log('VITE_SUPABASE_URL:', hasSupabaseUrl ? '✅ Loaded' : '❌ Missing')
console.log('VITE_SUPABASE_ANON_KEY:', hasSupabaseAnonKey ? '✅ Loaded' : '❌ Missing')

// 2️⃣ Warn if not prefixed correctly
if (hasSupabaseUrl && !'VITE_SUPABASE_URL'.startsWith('VITE_')) {
  console.warn('⚠️ VITE_SUPABASE_URL should be prefixed with VITE_')
}
if (hasSupabaseAnonKey && !'VITE_SUPABASE_ANON_KEY'.startsWith('VITE_')) {
  console.warn('⚠️ VITE_SUPABASE_ANON_KEY should be prefixed with VITE_')
}

// 3️⃣ Suggest restarting dev server
if (!hasSupabaseUrl || !hasSupabaseAnonKey) {
  console.warn('💡 Hint: If you recently added/updated .env, restart the dev server:\n   npm run dev\n   or\n   yarn dev')
}

// 4️⃣ Output actual values safely
console.log('---- Actual Values ----')
console.log('Supabase URL:', hasSupabaseUrl || 'Not set')
console.log('Supabase Anon Key:', hasSupabaseAnonKey ? 'Set' : 'Not set (never print full key!)')

console.groupEnd()

import { createClient } from '@supabase/supabase-js'

// Using any types to avoid generated type issues
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Helper function to check if user has specific role
export async function hasRole(role: 'Director' | 'SuperAdmin' | 'SchoolAdmin'): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  
  const { data } = await supabase.rpc('has_role' as any, {
    _user_id: user.id,
    _role: role
  })
  
  return data || false
}

// Helper function to check if user has specific permission
export async function hasPermission(resource: string, action: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  
  const { data } = await supabase.rpc('has_permission' as any, {
    _user_id: user.id,
    _resource: resource,
    _action: action
  })
  
  return data || false
}

// Helper function to get user role
export async function getUserRole(): Promise<'Director' | 'SuperAdmin' | 'SchoolAdmin' | null> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  
  const { data } = await supabase.rpc('get_user_role' as any, {
    _user_id: user.id
  })
  
  return data || null
}
