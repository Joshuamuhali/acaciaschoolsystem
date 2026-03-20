import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign, Edit, CheckCircle, Plus, Bus } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { getPupil, updatePupil } from "@/services/pupils";
import { getSchoolFees, getOtherFees, toggleOtherFee, getTransportRoutes, getPupilTransportAssignment, assignTransportToPupil, removeTransportFromPupil } from "@/services/fees";
import { getTerms } from "@/services/terms";
import { getGrades } from "@/services/grades";
import { supabase } from "@/integrations/supabase/client";
import { SkeletonProfile, SkeletonCard, SkeletonForm } from "@/components/skeleton";
import type { Pupil, SchoolFee, OtherFee, Term, Grade } from "@/types";

interface TransportRoute {
  id: number;
  route_name: string;
  region: string;
  fee_amount: number;
  active: boolean;
}

export default function PupilProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [pupil, setPupil] = useState<Pupil | null>(null);
  const [schoolFees, setSchoolFees] = useState<SchoolFee[]>([]);
  const [otherFees, setOtherFees] = useState<OtherFee[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [transportRoutes, setTransportRoutes] = useState<TransportRoute[]>([]);
  const [loading, setLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: "", sex: "", grade_id: "", parent_name: "", parent_phone: "" });
  const [feeToggles, setFeeToggles] = useState<Record<string, boolean>>({});
  const [feeAmounts, setFeeAmounts] = useState<Record<string, number>>({});
  const [includeTransport, setIncludeTransport] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Load pupil, fees, terms, grades
  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, sf, of, t, g] = await Promise.all([
        getPupil(id),
        getSchoolFees(id),
        getOtherFees(id),
        getTerms(),
        getGrades()
      ]);

      setPupil(p);
      setSchoolFees(sf);
      setOtherFees(of);
      setTerms(t);
      setGrades(g);

      setEditForm({
        full_name: p?.full_name || "",
        sex: p?.sex || "",
        grade_id: p?.grade_id || "",
        parent_name: p?.parent_name || "",
        parent_phone: p?.parent_phone || ""
      });

      const toggles: Record<string, boolean> = {};
      const amounts: Record<string, number> = {};
      of.forEach(fee => {
        toggles[fee.fee_type] = fee.is_enabled;
        amounts[fee.fee_type] = fee.total_expected;
      });
      setFeeToggles(toggles);
      setFeeAmounts(amounts);

      // Load transport routes
      const routes = await getTransportRoutes();
      setTransportRoutes(routes);

      // Check if pupil has transport assignment
      const transportAssignment = await getPupilTransportAssignment(id);

      if (transportAssignment) {
        setIncludeTransport(true);
        setSelectedTransport(transportAssignment.transport_routes.id);
      } else {
        setIncludeTransport(false);
        setSelectedTransport(null);
      }

    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [id]);

  // Calculate totals in real-time
  const totalSchoolFees = schoolFees.reduce((sum, f) => sum + Number(f.total_expected), 0);
  const totalOtherFees = Object.entries(feeToggles).reduce((sum, [fee, enabled]) => {
    return sum + (enabled ? (feeAmounts[fee] || 0) : 0);
  }, 0);
  const totalTransportFees = includeTransport && selectedTransport ?
    transportRoutes.find(r => r.id === selectedTransport)?.fee_amount || 0 : 0;
  const totalExpected = totalSchoolFees + totalOtherFees + totalTransportFees;

  const handleSavePupil = async () => {
    if (!pupil) return;

    // Validation
    if (!editForm.full_name.trim()) {
      toast({ title: "Error", description: "Full name is required", variant: "destructive" });
      return;
    }
    if (!editForm.sex) {
      toast({ title: "Error", description: "Sex is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      await updatePupil(pupil.id, editForm);

      // Update Other Fees
      const currentTerm = terms.find(t => t.is_active);
      if (currentTerm) {
        for (const [fee, enabled] of Object.entries(feeToggles)) {
          await toggleOtherFee(pupil.id, fee, enabled, currentTerm.id);
        }
      }

      // Update Transport Assignment
      if (includeTransport && selectedTransport) {
        // Assign transport route
        await assignTransportToPupil(pupil.id, selectedTransport);
      } else {
        // Remove transport assignment
        await removeTransportFromPupil(pupil.id);
      }

      toast({ title: "Success", description: "Pupil and fees updated successfully" });
      setEditOpen(false);
      loadData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="container mx-auto py-6 max-w-4xl">
      <SkeletonProfile />
    </div>
  );
  if (!pupil) return <div className="text-center py-12 text-muted-foreground">Pupil not found</div>;

  return (
    <div>
      <Button variant="ghost" onClick={() => navigate("/pupils")} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />Back to Pupils
      </Button>

      <div className="flex items-center justify-between page-header mb-4">
        <div>
          <h1 className="page-title font-heading">{pupil.full_name}</h1>
          <p className="page-description">Grade: {pupil.grades?.name}</p>
        </div>
        <div>
          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm"><Edit className="h-4 w-4 mr-2" />Edit Pupil & Fees</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Edit Pupil Info & Fees</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Full Name *</Label>
                    <Input
                      value={editForm.full_name}
                      onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label>Sex *</Label>
                    <Select value={editForm.sex} onValueChange={v => setEditForm({ ...editForm, sex: v })}>
                      <SelectTrigger><SelectValue placeholder="Select sex" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Grade</Label>
                    <Select value={editForm.grade_id} onValueChange={v => setEditForm({ ...editForm, grade_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
                      <SelectContent>
                        {grades.map(g => <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Status</Label>
                    <Select value={pupil.status} onValueChange={async (v) => {
                      try {
                        await updatePupil(pupil.id, { status: v as any });
                        setPupil(prev => prev ? { ...prev, status: v as any } : null);
                        toast({ title: "Status updated" });
                      } catch (e: any) {
                        toast({ title: "Error", description: e.message, variant: "destructive" });
                      }
                    }}>
                      <SelectTrigger><SelectValue placeholder={pupil.status} /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">New</SelectItem>
                        <SelectItem value="old">Old</SelectItem>
                        <SelectItem value="admitted">Admitted</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Parent Name</Label>
                    <Input
                      value={editForm.parent_name}
                      onChange={e => setEditForm({ ...editForm, parent_name: e.target.value })}
                      placeholder="Enter parent name"
                    />
                  </div>
                  <div>
                    <Label>Parent Phone</Label>
                    <Input
                      value={editForm.parent_phone}
                      onChange={e => setEditForm({ ...editForm, parent_phone: e.target.value })}
                      placeholder="Enter phone number"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-medium">Other Fees Management</Label>
                    <Badge variant="outline" className="text-xs">
                      {Object.values(feeToggles).filter(Boolean).length} enabled
                    </Badge>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {Object.entries(feeToggles).map(([fee, enabled]) => (
                      <div key={fee} className="flex items-center justify-between p-3 rounded-lg border bg-card/50">
                        <div className="flex items-center gap-3 flex-1">
                          <Checkbox
                            id={`fee-${fee}`}
                            checked={enabled}
                            onCheckedChange={async (checked) => {
                              const isChecked = checked as boolean;
                              
                              // Immediately call the API for this fee type
                              try {
                                await toggleOtherFee(pupil.id, fee, isChecked);
                                
                                // Update local state after successful API call
                                setFeeToggles(prev => ({ ...prev, [fee]: isChecked }));
                                
                                toast({
                                  title: isChecked ? "Fee Enabled" : "Fee Disabled",
                                  description: `${fee} has been ${isChecked ? 'enabled' : 'disabled'} for this pupil.`,
                                });
                                
                                // Refresh the pupil data to update totals
                                await loadData();
                              } catch (error) {
                                console.error('Error toggling fee:', error);
                                toast({
                                  title: "Error",
                                  description: `Failed to ${isChecked ? 'enable' : 'disable'} ${fee}. Please try again.`,
                                  variant: "destructive",
                                });
                              }
                            }}
                          />
                          <div className="flex-1">
                            <Label htmlFor={`fee-${fee}`} className="text-sm font-medium cursor-pointer">
                              {fee}
                            </Label>
                            <div className="text-xs text-muted-foreground">
                              Default: ZMW {(feeAmounts[fee] || 0).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {enabled && (
                            <>
                              <Input
                                type="number"
                                value={feeAmounts[fee] || 0}
                                onChange={(e) => setFeeAmounts(prev => ({
                                  ...prev,
                                  [fee]: Math.max(0, Number(e.target.value) || 0)
                                }))}
                                className="w-24 h-8 text-sm"
                                placeholder="Amount"
                                min="0"
                                step="10"
                              />
                              <span className="text-xs text-muted-foreground">ZMW</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Transport Selection */}
                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <Label className="text-base font-medium">Transport Options</Label>
                      <Badge variant="outline" className="text-xs">
                        {includeTransport ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 rounded-lg border bg-card/50">
                        <Checkbox
                          id="include-transport"
                          checked={includeTransport}
                          onCheckedChange={(checked) => {
                            setIncludeTransport(checked as boolean);
                            if (!checked) {
                              setSelectedTransport(null);
                            }
                          }}
                        />
                        <div className="flex-1">
                          <Label htmlFor="include-transport" className="text-sm font-medium cursor-pointer">
                            Include Transport Fees
                          </Label>
                          <div className="text-xs text-muted-foreground">
                            Enable transport for this pupil
                          </div>
                        </div>
                      </div>

                      {includeTransport && (
                        <div className="p-3 rounded-lg border bg-muted/30">
                          <Label className="text-sm font-medium mb-2 block">Select Transport Route</Label>
                          <Select
                            value={selectedTransport?.toString() || ""}
                            onValueChange={(value) => setSelectedTransport(value ? parseInt(value) : null)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a transport route" />
                            </SelectTrigger>
                            <SelectContent>
                              {transportRoutes.map((route) => (
                                <SelectItem key={route.id} value={route.id.toString()}>
                                  <div className="flex items-center justify-between w-full">
                                    <span>{route.route_name}</span>
                                    <div className="text-right">
                                      <Badge variant="outline" className="text-xs mr-2">{route.region}</Badge>
                                      <span className="text-xs font-medium">ZMW {route.fee_amount.toLocaleString()}</span>
                                    </div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {selectedTransport && (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Selected route fee: ZMW {transportRoutes.find(r => r.id === selectedTransport)?.fee_amount.toLocaleString()}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Real-time total calculation */}
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex justify-between items-center text-sm">
                      <span>School Fees:</span>
                      <span className="font-medium">ZMW {totalSchoolFees.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span>Other Fees:</span>
                      <span className="font-medium">ZMW {totalOtherFees.toLocaleString()}</span>
                    </div>
                    {includeTransport && selectedTransport && (
                      <div className="flex justify-between items-center text-sm">
                        <span>Transport:</span>
                        <span className="font-medium">ZMW {totalTransportFees.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-base font-semibold border-t pt-2 mt-2">
                      <span>Total Expected:</span>
                      <span className="text-primary">ZMW {totalExpected.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => setEditOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSavePupil}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-4 mb-6">
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Total Expected</p>
          <p className="text-2xl font-bold font-heading text-primary">ZMW {totalExpected.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">School Fees</p>
          <p className="text-2xl font-bold font-heading">ZMW {totalSchoolFees.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Other Fees</p>
          <p className="text-2xl font-bold font-heading">ZMW {totalOtherFees.toLocaleString()}</p>
        </div>
        <div className="stat-card">
          <p className="text-sm text-muted-foreground">Outstanding</p>
          <p className="text-2xl font-bold font-heading text-orange-600">
            ZMW {(schoolFees.reduce((s, f) => s + Number(f.balance), 0) + otherFees.reduce((s, f) => s + Number(f.balance), 0)).toLocaleString()}
          </p>
        </div>
      </div>

      <Tabs defaultValue="fees">
        <TabsList>
          <TabsTrigger value="fees">Fee Details</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-semibold">School Fees</h3>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Term</TableHead><TableHead>Expected</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {schoolFees.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.terms?.name ?? "-"}</TableCell>
                      <TableCell>ZMW {Number(f.total_expected).toLocaleString()}</TableCell>
                      <TableCell>ZMW {Number(f.total_collected).toLocaleString()}</TableCell>
                      <TableCell className="font-semibold text-secondary">ZMW {Number(f.balance).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {schoolFees.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No school fees.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="p-4 border-b">
                <h3 className="font-semibold">Other Fees</h3>
              </div>
              <Table>
                <TableHeader><TableRow><TableHead>Fee Type</TableHead><TableHead>Expected</TableHead><TableHead>Paid</TableHead><TableHead>Balance</TableHead></TableRow></TableHeader>
                <TableBody>
                  {otherFees.map((f) => (
                    <TableRow key={f.id}>
                      <TableCell>{f.fee_type}</TableCell>
                      <TableCell>ZMW {Number(f.total_expected).toLocaleString()}</TableCell>
                      <TableCell>ZMW {Number(f.collected).toLocaleString()}</TableCell>
                      <TableCell className="font-semibold text-secondary">ZMW {Number(f.balance).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                  {otherFees.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">No other fees.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="mt-4">
          <div className="text-center py-12 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Payment history will be displayed here</p>
            <p className="text-sm">Coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
