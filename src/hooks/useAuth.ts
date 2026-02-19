import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authService } from '@/services/auth'
import { AppRole } from '@/types/enums'

export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: authService.getCurrentUser,
    retry: false,
  })
}

export function useUserProfile(userId?: string) {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => authService.getUserProfile(userId),
    enabled: !!userId,
  })
}

export function useUserRole(userId?: string) {
  return useQuery({
    queryKey: ['userRole', userId],
    queryFn: () => authService.getUserRole(userId),
    enabled: !!userId,
  })
}

export function useUserPermissions(userId?: string) {
  return useQuery({
    queryKey: ['userPermissions', userId],
    queryFn: () => authService.getUserPermissions(userId),
    enabled: !!userId,
  })
}

export function useSignIn() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => 
      authService.signIn(email, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      queryClient.invalidateQueries({ queryKey: ['userRole'] })
      queryClient.invalidateQueries({ queryKey: ['userPermissions'] })
    },
  })
}

export function useSignUp() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ email, password, fullName }: { email: string; password: string; fullName: string }) => 
      authService.signUp(email, password, fullName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      queryClient.invalidateQueries({ queryKey: ['userRole'] })
      queryClient.invalidateQueries({ queryKey: ['userPermissions'] })
    },
  })
}

export function useSignOut() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authService.signOut,
    onSuccess: () => {
      queryClient.clear()
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authService.updateProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] })
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
    },
  })
}

export function useAssignRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) => 
      authService.assignRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      queryClient.invalidateQueries({ queryKey: ['userRole'] })
      queryClient.invalidateQueries({ queryKey: ['userPermissions'] })
    },
  })
}

export function useRemoveRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authService.removeRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userProfile'] })
      queryClient.invalidateQueries({ queryKey: ['userRole'] })
      queryClient.invalidateQueries({ queryKey: ['userPermissions'] })
    },
  })
}

export function useResetPassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authService.resetPassword,
    onSuccess: () => {
      // No invalidation needed as this is an external action
    },
  })
}

export function useCheckPermission() {
  return useMutation({
    mutationFn: ({ resource, action }: { resource: string; action: string }) => 
      authService.checkPermission(resource, action),
  })
}

export function useHasRole(role: AppRole) {
  return useQuery({
    queryKey: ['hasRole', role],
    queryFn: () => authService.hasRole(role),
    retry: false,
  })
}
