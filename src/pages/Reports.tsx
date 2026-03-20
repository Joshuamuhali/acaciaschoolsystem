import { useEffect, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { dataSourceManager } from "@/services/datasource";
import { useDashboardData } from "@/hooks/data/useDashboardData";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { SkeletonTable, SkeletonStatsCard } from "@/components/skeleton";

export default function Reports() {
  const { toast } = useToast();
  const { stats, gradeCounts, installments, loading: dashboardLoading } = useDashboardData();
  const [outByGrade, setOutByGrade] = useState<{ name: string; outstanding: number }[]>([]);
  const [collByTerm, setCollByTerm] = useState<{ name: string; collected: number }[]>([]);
  const [daily, setDaily] = useState<{ date: string; total: number }[]>([]);
  const [pupilStatements, setPupilStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate analytics data from dashboard data
  useEffect(() => {
    if (stats && gradeCounts && installments) {
      try {
        // Calculate outstanding by grade
        const gradeOutstanding = gradeCounts.map(grade => {
          const gradeInstallments = installments.filter(inst => inst.term === grade.name);
          const totalExpected = gradeInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
          const totalCollected = gradeInstallments.filter(inst => inst.status === 'Paid').reduce((sum, inst) => sum + (inst.amount || 0), 0);
          return {
            name: grade.name,
            outstanding: totalExpected - totalCollected
          };
        }).filter(grade => grade.outstanding > 0);

        // Calculate collection by term (mock data for now - can be enhanced)
        const termCollection = [
          { name: 'Term 1', collected: stats.totalCollected * 0.4 },
          { name: 'Term 2', collected: stats.totalCollected * 0.3 },
          { name: 'Term 3', collected: stats.totalCollected * 0.3 }
        ];

        // Calculate daily collection (last 30 days)
        const dailyCollection = [];
        for (let i = 29; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dayInstallments = installments.filter(inst => {
            const instDate = new Date(inst.payment_date);
            return instDate.toDateString() === date.toDateString();
          });
          const total = dayInstallments.filter(inst => inst.status === 'Paid').reduce((sum, inst) => sum + (inst.amount || 0), 0);
          dailyCollection.push({
            date: date.toISOString().split('T')[0],
            total
          });
        }

        // Pupil statements
        const statements = gradeCounts.map(grade => {
          const gradeInstallments = installments.filter(inst => inst.term === grade.name);
          const totalPaid = gradeInstallments.filter(inst => inst.status === 'Paid').reduce((sum, inst) => sum + (inst.amount || 0), 0);
          const totalExpected = gradeInstallments.reduce((sum, inst) => sum + (inst.amount || 0), 0);
          return {
            id: grade.id,
            full_name: `Grade ${grade.name} Total`,
            grades: { name: grade.name },
            totalPaid,
            balance: totalExpected - totalPaid
          };
        });

        setOutByGrade(gradeOutstanding);
        setCollByTerm(termCollection);
        setDaily(dailyCollection);
        setPupilStatements(statements);
        setLoading(false);
      } catch (error) {
        console.error('Error calculating analytics:', error);
        setLoading(false);
      }
    }
  }, [stats, gradeCounts, installments]);

  // Export functions
  const exportOutstandingByGrade = () => {
    const csv = [
      ['Grade', 'Outstanding'],
      ...outByGrade.map(item => [item.name, item.outstanding.toString()])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'outstanding-by-grade.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportCollectionByTerm = () => {
    const csv = [
      ['Term', 'Collected'],
      ...collByTerm.map(item => [item.name, item.collected.toString()])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'collection-by-term.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportPupilStatements = () => {
    const csv = [
      ['Pupil', 'Grade', 'Total Paid', 'Balance'],
      ...pupilStatements.map(item => [item.full_name, item.grades?.name || '', item.totalPaid.toString(), item.balance.toString()])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pupil-statements.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div>
        <div className="page-header">
          <div className="h-8 w-32 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-muted rounded animate-pulse" />
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 mb-6">
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

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 mb-6">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Total Expected</p>
          <p className="text-2xl font-bold font-heading text-primary">ZMW {stats.totalExpected.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Total Collected</p>
          <p className="text-2xl font-bold font-heading text-success">ZMW {stats.totalCollected.toLocaleString()}</p>
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
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 mb-4">
            <div className="flex flex-col sm:flex-row items-center gap-2">
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
          <div className="rounded-xl border bg-card overflow-x-auto">
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
          <div className="rounded-xl border bg-card overflow-x-auto">
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
          <div className="rounded-xl border bg-card overflow-x-auto">
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
          <div className="rounded-xl border bg-card overflow-x-auto">
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
