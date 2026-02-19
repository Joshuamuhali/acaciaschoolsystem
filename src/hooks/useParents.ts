import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
// import type { Tables, TablesInsert } from "@/lib/supabase/types"; // Using any types for now
import { toast } from "sonner";

export function useParents() {
  return useQuery({
    queryKey: ["parents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parents")
        .select("*, pupils(id, full_name, grade_id)")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (parent: any) => {
      const { error } = await supabase.from("parents").insert(parent);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parents"] });
      toast.success("Parent created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: string; full_name?: string; phone_number?: string | null; account_number?: string | null }) => {
      const { error } = await supabase.from("parents").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parents"] });
      toast.success("Parent updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteParent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("parents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["parents"] });
      toast.success("Parent deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
