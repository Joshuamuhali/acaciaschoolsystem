import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getOutstandingPerGrade, getCollectionPerTerm, getDailyCollection, getSchoolTotals } from "@/services/fees";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";

export default function Reports() {
  const { toast } = useToast();
  const [outByGrade, setOutByGrade] = useState<{ name: string; outstanding: number }[]>([]);
  const [collByTerm, setCollByTerm] = useState<{ name: string; collected: number }[]>([]);
  const [daily, setDaily] = useState<{ date: string; total: number }[]>([]);
  const [pupilStatements, setPupilStatements] = useState<any[]>([]);
  const [schoolTotals, setSchoolTotals] = useState<{ totalExpected: number; totalCollected: number }>({ totalExpected: 0, totalCollected: 0 });
  const [loading, setLoading] = useState(true);

  // CSV Export Functions
  const exportToCSV = (data: any[], filename: string, headers: string[]) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row =>
        headers.map(header => {
          const value = row[header.toLowerCase().replace(/\s+/g, '')] || row[header] || '';
          return `"${String(value).replace(/"/g, '""')}"`;
        }).join(',')
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportOutstandingByGrade = () => {
    const headers = ['Grade', 'Outstanding Amount'];
    const data = outByGrade.map(item => ({
      grade: item.name,
      outstandingAmount: `ZMW ${item.outstanding.toLocaleString()}`
    }));
    exportToCSV(data, 'outstanding-by-grade.csv', headers);
    toast({ title: "Export Complete", description: "Outstanding by grade report exported successfully" });
  };

  const exportCollectionByTerm = () => {
    const headers = ['Term', 'Collected Amount'];
    const data = collByTerm.map(item => ({
      term: item.name,
      collectedAmount: `ZMW ${item.collected.toLocaleString()}`
    }));
    exportToCSV(data, 'collection-by-term.csv', headers);
    toast({ title: "Export Complete", description: "Collection by term report exported successfully" });
  };

  const exportPupilStatements = () => {
    const headers = ['Name', 'Grade', 'Total Paid', 'Balance'];
    const data = pupilStatements.map(item => ({
      name: item.full_name,
      grade: item.grades?.name || 'N/A',
      totalPaid: `ZMW ${(item.totalPaid || 0).toLocaleString()}`,
      balance: `ZMW ${(item.balance || 0).toLocaleString()}`
    }));
    exportToCSV(data, 'pupil-statements.csv', headers);
    toast({ title: "Export Complete", description: "Pupil statements exported successfully" });
  };

  useEffect(() => {
    const load = async () => {
      try {
        const [a, b, c, ps, totals] = await Promise.all([
          getOutstandingPerGrade(),
          getCollectionPerTerm(),
          getDailyCollection(),
          supabase.from("pupils").select("id, full_name, admission_number, grades(name)").eq("status", "active").order("full_name"),
          getSchoolTotals(),
        ]);
        setOutByGrade(a); setCollByTerm(b); setDaily(c); setSchoolTotals(totals);

        // Get balances for each pupil
        const { data: fees } = await supabase.from("school_fees").select("pupil_id, balance");
        const balanceMap: Record<string, number> = {};
        fees?.forEach((f) => { balanceMap[f.pupil_id] = (balanceMap[f.pupil_id] ?? 0) + Number(f.balance); });

        const { data: instData } = await supabase.from("installments").select("pupil_id, amount_paid");
        const paidMap: Record<string, number> = {};
        instData?.forEach((i) => { paidMap[i.pupil_id] = (paidMap[i.pupil_id] ?? 0) + Number(i.amount_paid); });

        const stmts = (ps.data ?? []).map((p: any) => ({
          ...p,
          totalPaid: paidMap[p.id] ?? 0,
          balance: balanceMap[p.id] ?? 0,
        }));
        setPupilStatements(stmts);
      } catch (e: any) {
        toast({ title: "Error", description: e.message, variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title font-heading">Reports</h1>
        <p className="page-description">Financial reports and statements</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Total Expected</p>
          <p className="text-2xl font-bold font-heading text-primary">ZMW {schoolTotals.totalExpected.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Total Collected</p>
          <p className="text-2xl font-bold font-heading text-success">ZMW {schoolTotals.totalCollected.toLocaleString()}</p>
        </div>
      </div>

      <Tabs defaultValue="grade">
        <TabsList>
          <TabsTrigger value="grade">Outstanding by Grade</TabsTrigger>
          <TabsTrigger value="term">Collection by Term</TabsTrigger>
          <TabsTrigger value="daily">Daily Collection</TabsTrigger>
          <TabsTrigger value="statements">Pupil Statements</TabsTrigger>
        </TabsList>

        <TabsContent value="grade" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={exportOutstandingByGrade} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Grade</TableHead><TableHead>Outstanding</TableHead></TableRow></TableHeader>
              <TableBody>
                {outByGrade.map((r) => (
                  <TableRow key={r.name}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-secondary font-semibold">ZMW {r.outstanding.toLocaleString()}</TableCell></TableRow>
                ))}
                {outByGrade.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No data.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="term" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={exportCollectionByTerm} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Term</TableHead><TableHead>Total Collected</TableHead></TableRow></TableHeader>
              <TableBody>
                {collByTerm.map((r) => (
                  <TableRow key={r.name}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-success font-semibold">ZMW {r.collected.toLocaleString()}</TableCell></TableRow>
                ))}
                {collByTerm.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No data.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="daily" className="mt-4">
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Total Collected</TableHead></TableRow></TableHeader>
              <TableBody>
                {daily.map((r) => (
                  <TableRow key={r.date}><TableCell className="font-medium">{new Date(r.date).toLocaleDateString()}</TableCell><TableCell className="text-success font-semibold">ZMW {r.total.toLocaleString()}</TableCell></TableRow>
                ))}
                {daily.length === 0 && <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground py-6">No data.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="statements" className="mt-4">
          <div className="flex justify-end mb-4">
            <Button onClick={exportPupilStatements} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          <div className="rounded-xl border bg-card overflow-hidden">
            <Table>
              <TableHeader><TableRow><TableHead>Pupil</TableHead><TableHead>Adm No.</TableHead><TableHead>Grade</TableHead><TableHead>Total Paid</TableHead><TableHead>Balance</TableHead></TableRow></TableHeader>
              <TableBody>
                {pupilStatements.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell>{p.admission_number}</TableCell>
                    <TableCell>{p.grades?.name}</TableCell>
                    <TableCell className="text-success font-semibold">ZMW {p.totalPaid.toLocaleString()}</TableCell>
                    <TableCell className="text-secondary font-semibold">ZMW {p.balance.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {pupilStatements.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">No data.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
