import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getOutstandingPerGrade, getCollectionPerTerm, getDailyCollection, getSchoolTotals } from "@/services/fees";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { SkeletonTable, SkeletonStatsCard } from "@/components/skeleton";

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
          supabase.from("pupil_financial_summary").select("*").eq("status", "active").order("full_name"),
          getSchoolTotals(),
        ]);

        // Transform data to match expected types
        const transformedOutByGrade = (a || []).map(item => ({
          name: item.grade_name || 'Unknown',
          outstanding: item.total_outstanding || 0
        }));

        const transformedCollByTerm = (b || []).map((item: any) => ({
          name: item.term,
          collected: item.collected
        }));

        setOutByGrade(transformedOutByGrade);
        setCollByTerm(transformedCollByTerm);
        setDaily(c);
        setSchoolTotals(totals);

        // Pupil statements now come directly from the view with pre-calculated balances
        const stmts = (ps.data ?? []).map((p: any) => ({
          ...p,
          totalPaid: p.total_collected, // Already calculated in view
          balance: p.total_balance, // Already calculated in view
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

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <SkeletonStatsCard />
          <SkeletonStatsCard />
        </div>

        <div className="h-10 w-full bg-muted rounded animate-pulse mb-4" />
        <SkeletonTable rows={6} columns={2} />
      </div>
    );
  }

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
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const sorted = [...outByGrade].sort((a, b) => a.name.localeCompare(b.name));
                  setOutByGrade(sorted);
                }}
              >
                Sort by Grade Name
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const sorted = [...outByGrade].sort((a, b) => b.outstanding - a.outstanding);
                  setOutByGrade(sorted);
                }}
              >
                Sort by Outstanding (High to Low)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const sorted = [...outByGrade].sort((a, b) => a.outstanding - b.outstanding);
                  setOutByGrade(sorted);
                }}
              >
                Sort by Outstanding (Low to High)
              </Button>
            </div>
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
                  <TableRow key={r.name}><TableCell className="font-medium">{r.name}</TableCell><TableCell className="text-secondary font-semibold">ZMW {(r.outstanding || 0).toLocaleString()}</TableCell></TableRow>
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
              <TableHeader><TableRow><TableHead>Pupil</TableHead><TableHead>Grade</TableHead><TableHead>Total Paid</TableHead><TableHead>Balance</TableHead></TableRow></TableHeader>
              <TableBody>
                {pupilStatements.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name}</TableCell>
                    <TableCell>{p.grades?.name}</TableCell>
                    <TableCell className="text-success font-semibold">ZMW {p.totalPaid.toLocaleString()}</TableCell>
                    <TableCell className="text-secondary font-semibold">ZMW {p.balance.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {pupilStatements.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No data.</TableCell></TableRow>}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
