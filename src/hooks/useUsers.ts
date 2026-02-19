import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
// import type { TablesInsert, TablesUpdate } from "@/lib/supabase/types"; // Using any types for now
import { toast } from "sonner";

// User with role and profile info
export interface UserWithRole {
  id: string;
  email: string;
  full_name: string | null;
  role: "Director" | "SuperAdmin" | "SchoolAdmin";
  created_at: string;
  last_sign_in_at: string | null;
}

export function useUsers() {
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users_with_roles")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as UserWithRole[];
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      email, 
      password, 
      fullName, 
      role 
    }: { 
      email: string; 
      password: string; 
      fullName: string; 
      role: "Director" | "SuperAdmin" | "SchoolAdmin";
    }) => {
      // Step 1: Create user in auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Step 2: Assign role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({ user_id: authData.user.id, role });

      if (roleError) throw roleError;

      return authData.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      userId, 
      newRole 
    }: { 
      userId: string; 
      newRole: "Director" | "SuperAdmin" | "SchoolAdmin";
    }) => {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User role updated");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (userId: string) => {
      // Delete user role first
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Delete user from auth
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

// Create a view for users with roles
export const createUserRolesView = `
CREATE OR REPLACE VIEW public.users_with_roles AS
SELECT 
  u.id,
  u.email,
  p.full_name,
  ur.role,
  u.created_at,
  u.last_sign_in_at
FROM auth.users u
LEFT JOIN public.profiles p ON u.id = p.id
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE ur.role IS NOT NULL
ORDER BY u.created_at DESC;
`;
