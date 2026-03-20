import { useEffect, useState } from "react";
import { Search, Users, DollarSign, Calendar, Receipt, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDataSource } from "@/context/DataSourceContext";
import { parseSchoolReconciliationSheet } from "@/services/datasource/excel/schoolReconciliationParser";
import { loadWorkbook } from "@/services/datasource/excel/workbook";
import { dataSourceManager } from "@/services/datasource";
import type { ParsedPupilFeeRow } from "@/services/datasource/excel/schoolReconciliationParser";

type ParsedPupil = ParsedPupilFeeRow & {
  id: string;
};

export default function PupilsPage() {
  const { source } = useDataSource();
  const [pupils, setPupils] = useState<ParsedPupil[]>([]);
  const [filteredPupils, setFilteredPupils] = useState<ParsedPupil[]>([]);
  const [selectedPupil, setSelectedPupil] = useState<ParsedPupil | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPupils();
  }, []);

  useEffect(() => {
    // Reload data when source changes
    setPupils([]);
    setFilteredPupils([]);
    setSelectedPupil(null);
    loadPupils();
  }, [source]);

  useEffect(() => {
    filterPupils();
  }, [pupils, searchTerm]);

  const loadPupils = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (source === 'excel') {
        // Load Excel data
        const workbook = await loadWorkbook();
        const sheet = workbook.Sheets["TERM 1 2026"];
        
        if (!sheet) {
          throw new Error("TERM 1 2026 sheet not found");
        }

        const { pupils: rawPupils } = parseSchoolReconciliationSheet(sheet);

        const parsedPupils: ParsedPupil[] = rawPupils.map((pupil) => ({
          ...pupil,
          id: `${pupil.className}__${pupil.fullName}__${pupil.rowIndex}`,
        }));

        setPupils(parsedPupils);
        
      } else if (source === 'supabase') {
        // Load Supabase data
        const dataSource = dataSourceManager.getCurrentDataSource();
        const supabasePupils = await dataSource.getPupils();
        
        if (supabasePupils.length === 0) {
          setError("No records found in Supabase for the selected dataset.");
          return;
        }
        
        // Convert Supabase pupils to our format
        const parsedPupils: ParsedPupil[] = supabasePupils.map((pupil, index) => ({
          id: pupil.id,
          rowIndex: index,
          className: pupil.grade_id || 'Unknown',
          fullName: pupil.full_name,
          sex: pupil.sex as 'M' | 'F' | null,
          oldOrNew: pupil.old_or_new as 'O' | 'N' | null,
          totalSchoolFees: pupil.total_fees,
          firstInstallmentAmount: 0, // Supabase structure may differ
          firstInstallmentDate: null,
          firstInstallmentReceiptNo: null,
          secondInstallmentAmount: 0,
          secondInstallmentDate: null,
          secondInstallmentReceiptNo: null,
          thirdInstallmentAmount: 0,
          thirdInstallmentDate: null,
          thirdInstallmentReceiptNo: null,
          totalPaid: 0, // Would need to be calculated from payment records
          computedBalance: pupil.balance,
          paymentStatus: pupil.payment_status === 'paid' ? 'paid_in_full' :
                        pupil.payment_status === 'partial' ? 'with_balance' :
                        pupil.payment_status === 'unpaid' ? 'not_paid' : 'not_paid',
        }));

        setPupils(parsedPupils);
      }
      
    } catch (err) {
      if (source === 'supabase') {
        setError("Unable to load data from Supabase. Check connection, query, or available records.");
      } else {
        setError(err instanceof Error ? err.message : "Failed to load pupils");
      }
    } finally {
      setLoading(false);
    }
  };

  const filterPupils = () => {
    if (!searchTerm.trim()) {
      setFilteredPupils(pupils);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = pupils.filter(pupil =>
      pupil.fullName.toLowerCase().includes(searchLower) ||
      (pupil.className && pupil.className.toLowerCase().includes(searchLower))
    );
    setFilteredPupils(filtered);
  };

  const getStatusBadge = (status: ParsedPupil['paymentStatus']) => {
    const variants = {
      paid_in_full: "bg-green-100 text-green-800",
      with_balance: "bg-yellow-100 text-yellow-800",
      not_paid: "bg-red-100 text-red-800",
      overpaid: "bg-blue-100 text-blue-800",
    };

    const labels = {
      paid_in_full: "Paid in Full",
      with_balance: "With Balance",
      not_paid: "Not Paid",
      overpaid: "Overpaid",
    };

    return (
      <Badge className={variants[status]}>
        {labels[status]}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZM', {
      style: 'currency',
      currency: 'ZMW',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Pupils</h1>
        </div>
        <div className="grid gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Pupils</h1>
          <div className="text-sm text-muted-foreground">
            Data Source: <span className="font-semibold">{source === 'excel' ? 'Excel' : 'Supabase'}</span>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <p className="text-red-600 font-medium">{error}</p>
              {source === 'supabase' && (
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>• Check your Supabase connection settings</p>
                  <p>• Verify the database has pupil records</p>
                  <p>• Ensure proper permissions are configured</p>
                </div>
              )}
              <Button onClick={loadPupils} className="mt-4">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Pupils</h1>
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            Data Source: <span className="font-semibold">{source === 'excel' ? 'Excel' : 'Supabase'}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {filteredPupils.length} of {pupils.length} pupils
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pupils Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Total Fees</TableHead>
                <TableHead>Total Paid</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPupils.map((pupil) => (
                <TableRow
                  key={pupil.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedPupil(pupil)}
                >
                  <TableCell className="font-medium">
                    {pupil.fullName}
                  </TableCell>
                  <TableCell>{pupil.className}</TableCell>
                  <TableCell>{formatCurrency(pupil.totalSchoolFees)}</TableCell>
                  <TableCell>{formatCurrency(pupil.totalPaid)}</TableCell>
                  <TableCell>{formatCurrency(pupil.computedBalance)}</TableCell>
                  <TableCell>{getStatusBadge(pupil.paymentStatus)}</TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pupil Detail Sheet */}
      <Sheet open={!!selectedPupil} onOpenChange={(open) => !open && setSelectedPupil(null)}>
        <SheetContent className="w-[600px] sm:w-[800px]">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              Pupil Details
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedPupil(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </SheetTitle>
          </SheetHeader>

          {selectedPupil && (
            <div className="space-y-6 mt-6">
              {/* Pupil Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Pupil Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                      <p className="text-lg font-semibold">{selectedPupil.fullName}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Class</label>
                      <p className="text-lg">{selectedPupil.className}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Sex</label>
                      <p className="text-lg">{selectedPupil.sex || 'Not recorded'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Old/New</label>
                      <p className="text-lg">{selectedPupil.oldOrNew || 'Not recorded'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Fee Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5" />
                    Fee Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total Fees</label>
                      <p className="text-xl font-bold">{formatCurrency(selectedPupil.totalSchoolFees)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Total Paid</label>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(selectedPupil.totalPaid)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Balance Owed</label>
                      <p className={`text-xl font-bold ${selectedPupil.computedBalance > 0 ? 'text-red-600' : selectedPupil.computedBalance < 0 ? 'text-blue-600' : 'text-green-600'}`}>
                        {formatCurrency(selectedPupil.computedBalance)}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Status</label>
                      <div className="mt-1">{getStatusBadge(selectedPupil.paymentStatus)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Installments */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Installment Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    {/* First Installment */}
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">First Installment</h4>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(selectedPupil.firstInstallmentAmount)}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {selectedPupil.firstInstallmentDate || 'Not recorded'}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground mt-1">
                            <Receipt className="h-3 w-3" />
                            {selectedPupil.firstInstallmentReceiptNo || 'Not recorded'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Second Installment */}
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">Second Installment</h4>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(selectedPupil.secondInstallmentAmount)}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {selectedPupil.secondInstallmentDate || 'Not recorded'}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground mt-1">
                            <Receipt className="h-3 w-3" />
                            {selectedPupil.secondInstallmentReceiptNo || 'Not recorded'}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Third Installment */}
                    <div className="border rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-medium">Third Installment</h4>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(selectedPupil.thirdInstallmentAmount)}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {selectedPupil.thirdInstallmentDate || 'Not recorded'}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground mt-1">
                            <Receipt className="h-3 w-3" />
                            {selectedPupil.thirdInstallmentReceiptNo || 'Not recorded'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
