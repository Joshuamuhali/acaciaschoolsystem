import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";

export function useAuditLogs() {
  return useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });
}
