import PageHeader from "@/components/PageHeader";
import { useAuditLogs } from "@/hooks/useAuditLogs";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

export default function AuditLogs() {
  const { data: logs, isLoading } = useAuditLogs();

  return (
    <div>
      <PageHeader title="Audit Logs" description="View all system activity and financial changes" />

      <div className="bg-card border border-border rounded-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground">Timestamp</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Action</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Table</th>
                <th className="px-4 py-3 font-medium text-muted-foreground">Record ID</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">Loading...</td></tr>
              ) : !logs?.length ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">No audit logs yet</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 text-muted-foreground">{format(new Date(log.created_at), "dd MMM yyyy HH:mm")}</td>
                    <td className="px-4 py-3">
                      <Badge variant={log.action_type === "SOFT_DELETE" ? "destructive" : "default"}>
                        {log.action_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground">{log.table_name}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.record_id?.slice(0, 8) || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
