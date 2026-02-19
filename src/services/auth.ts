import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/supabase'
import { AppRole } from '@/types/enums'

type Profile = Database['public']['Tables']['profiles']['Row']
type UserRole = Database['public']['Tables']['user_roles']['Row']

export const authService = {
  // User authentication with roles
  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error
    return data
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    return true
  },

  async signUp(email: string, password: string, fullName: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    })

    if (error) throw error
    return data
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  // Get user profile with role
  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('users_with_roles' as any)
      .select('*')
      .eq('id', userId)
      .single()

    if (error) throw error
    return data
  },

  // Role-based permission checking using has_permission function
  async checkPermission(resource: string, action: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data } = await supabase.rpc('has_permission' as any, {
      _user_id: user.id,
      _resource: resource,
      _action: action
    })

    if (error) throw error
    return data || false
  },

  // Get user role using RPC function
  async getUserRole(userId?: string): Promise<AppRole | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const targetUserId = userId || user.id

    const { data } = await supabase.rpc('get_user_role' as any, {
      _user_id: targetUserId
    })

    if (error) throw error
    return data || null
  },

  // Check if user has specific role
  async hasRole(role: AppRole): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { data } = await supabase.rpc('has_role' as any, {
      _user_id: user.id,
      _role: role
    })

    if (error) throw error
    return data || false
  },

  // Get all user permissions
  async getUserPermissions(userId?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const targetUserId = userId || user.id

    const { data } = await supabase.rpc('get_user_permissions' as any, {
      _user_id: targetUserId
    })

    if (error) throw error
    return data || []
  },

  // Profile management
  async updateProfile(updates: Partial<Profile>) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('No authenticated user')

    const { data, error } = await supabase
      .from('profiles' as any)
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Assign role to user (admin only)
  async assignRole(userId: string, role: AppRole) {
    const { data, error } = await supabase
      .from('user_roles' as any)
      .upsert({
        user_id: userId,
        role: role
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Remove role from user (admin only)
  async removeRole(userId: string) {
    const { error } = await supabase
      .from('user_roles' as any)
      .delete()
      .eq('user_id', userId)

    if (error) throw error
    return true
  },

  // Reset password (admin only)
  async resetPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
    return true
  },

  // Log resource access
  async logAccess(resource: string, action: string, resourceId?: string, success = true, denialReason?: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.rpc('log_resource_access' as any, {
      _user_id: user.id,
      _resource: resource,
      _action: action,
      _resource_id: resourceId || null,
      _success: success,
      _denial_reason: denialReason || null
    })
  },

  // Get session
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession()
    return session
  },

  // Listen to auth changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  }
}
