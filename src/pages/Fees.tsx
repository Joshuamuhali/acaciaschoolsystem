import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function Fees() {
  const [data, setData] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const { data: fees, error } = await supabase
          .from("school_fees")
          .select("*, pupils(full_name, grades(name)), terms(name)")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setData(fees ?? []);
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = data.filter((f: any) =>
    f.pupils?.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title font-heading">Fees Overview</h1>
        <p className="page-description">All school fee records</p>
      </div>

      <div className="relative max-w-sm mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search by pupil name..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? <p className="text-muted-foreground">Loading...</p> : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pupil</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Term</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f: any) => (
                <TableRow key={f.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/pupils/${f.pupil_id}`)}>
                  <TableCell className="font-medium">{f.pupils?.full_name}</TableCell>
                  <TableCell>{f.pupils?.grades?.name}</TableCell>
                  <TableCell>{f.terms?.name}</TableCell>
                  <TableCell>ZMW {Number(f.total_amount).toLocaleString()}</TableCell>
                  <TableCell>ZMW {Number(f.discount).toLocaleString()}</TableCell>
                  <TableCell className="font-semibold text-secondary">ZMW {Number(f.balance).toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={Number(f.balance) === 0 ? "default" : "secondary"}>
                      {Number(f.balance) === 0 ? "Paid" : "Pending"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No fee records found.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
