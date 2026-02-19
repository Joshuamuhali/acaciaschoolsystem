import { useState } from "react";
import { useSchoolSettings, useUpdateSchoolSettings } from "@/hooks/useSuperAdmin";
import { useGrades, useCreateGrade, useDeleteGrade } from "@/hooks/useGrades";
import { useAuthWithPermissions } from "@/hooks/useAuthWithPermissions";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Settings, 
  Palette, 
  GraduationCap, 
  Plus, 
  Trash2, 
  Edit, 
  DollarSign,
  Calendar,
  Image,
  Shield
} from "lucide-react";
import { toast } from "sonner";

export default function SuperAdminSchoolSettings() {
  const { data: settings, isLoading: settingsLoading, error: settingsError } = useSchoolSettings();
  const { data: grades, isLoading: gradesLoading, error: gradesError } = useGrades();
  const updateSettings = useUpdateSchoolSettings();
  const createGrade = useCreateGrade();
  const deleteGrade = useDeleteGrade();
  const { isSuperAdmin, isSchoolAdmin } = useAuthWithPermissions();
  const { currency: currentCurrency, updateCurrency } = useCurrency();
  
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [newGradeName, setNewGradeName] = useState("");
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState(currentCurrency);

  // Both Super Admin and School Admin can access
  const canAccess = isSuperAdmin?.() || isSchoolAdmin?.();
  
  if (!canAccess) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Access Restricted</p>
            <p className="text-sm">Only administrators can manage school settings.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state if data fails to load
  if (settingsError || gradesError) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold font-display text-foreground">School Settings</h2>
            <p className="text-muted-foreground">Configure school information and system settings</p>
          </div>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
              <p className="font-medium text-red-700">Failed to load settings</p>
              <p className="text-sm text-red-600 mt-2">
                {settingsError?.message || gradesError?.message || "Unable to fetch data from database"}
              </p>
              <p className="text-xs text-muted-foreground mt-4">
                Please check that the database tables exist and try refreshing the page.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleUpdateSettings = (field: string, value: any) => {
    if (!settings || 'error' in settings) return;
    
    updateSettings.mutate({
      id: (settings as any).id,
      [field]: value,
    });
  };

  const handleCreateGrade = (e: React.FormEvent) => {
    e.preventDefault();
    createGrade.mutate(newGradeName, {
      onSuccess: () => {
        setGradeDialogOpen(false);
        setNewGradeName("");
      },
    });
  };

  const handleDeleteGrade = (gradeId: string) => {
    if (confirm("Are you sure you want to delete this grade? This action cannot be undone.")) {
      deleteGrade.mutate(gradeId);
    }
  };

  const handleCurrencyChange = async (newCurrency: string) => {
    try {
      await updateCurrency(newCurrency);
      setSelectedCurrency(newCurrency);
      toast.success(`Currency updated to ${newCurrency}`);
    } catch (error) {
      toast.error("Failed to update currency");
      console.error("Currency update error:", error);
    }
  };

  // Extract settings values safely
  const settingsData = settings && !('error' in settings) ? settings as any : null;

  if (settingsLoading || gradesLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 bg-muted rounded"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-foreground">School Settings</h2>
          <p className="text-muted-foreground">Configure school information and system settings</p>
        </div>
      </div>

      <Tabs defaultValue={isSchoolAdmin?.() ? "grades" : "general"} className="space-y-6">
        <TabsList>
          {isSuperAdmin?.() && (
            <>
              <TabsTrigger value="general">General Settings</TabsTrigger>
              <TabsTrigger value="appearance">Appearance</TabsTrigger>
            </>
          )}
          <TabsTrigger value="grades">Grade Structure</TabsTrigger>
          <TabsTrigger value="payment">Payment Settings</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                School Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>School Name</Label>
                <Input
                  value={settingsData?.school_name || ""}
                  onChange={(e) => handleUpdateSettings("school_name", e.target.value)}
                  placeholder="Enter school name"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Currency Code</Label>
                <Select
                  value={selectedCurrency || "ZMW"}
                  onValueChange={handleCurrencyChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ZMW">ZMW - Zambian Kwacha</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                    <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                    <SelectItem value="ZAR">ZAR - South African Rand</SelectItem>
                    <SelectItem value="NGN">NGN - Nigerian Naira</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Current: {currentCurrency} - This will update across all pages
                </p>
              </div>

              <div className="space-y-2">
                <Label>Currency Symbol</Label>
                <Select
                  value={settingsData?.currency_symbol || "K"}
                  onValueChange={(value) => handleUpdateSettings("currency_symbol", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="K">K (Zambia)</SelectItem>
                    <SelectItem value="$">$ (USD)</SelectItem>
                    <SelectItem value="£">£ (GBP)</SelectItem>
                    <SelectItem value="€">€ (EUR)</SelectItem>
                    <SelectItem value="₹">₹ (INR)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Academic Year Start Month</Label>
                <Select
                  value={settingsData?.academic_year_start_month?.toString() || "1"}
                  onValueChange={(value) => handleUpdateSettings("academic_year_start_month", Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">January</SelectItem>
                    <SelectItem value="2">February</SelectItem>
                    <SelectItem value="3">March</SelectItem>
                    <SelectItem value="4">April</SelectItem>
                    <SelectItem value="5">May</SelectItem>
                    <SelectItem value="6">June</SelectItem>
                    <SelectItem value="7">July</SelectItem>
                    <SelectItem value="8">August</SelectItem>
                    <SelectItem value="9">September</SelectItem>
                    <SelectItem value="10">October</SelectItem>
                    <SelectItem value="11">November</SelectItem>
                    <SelectItem value="12">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Colors & Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Primary Color (Success/Paid)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={settingsData?.color_primary || "#28A745"}
                    onChange={(e) => handleUpdateSettings("color_primary", e.target.value)}
                    className="w-16 h-10"
                  />
                  <Input
                    value={settingsData?.color_primary || "#28A745"}
                    onChange={(e) => handleUpdateSettings("color_primary", e.target.value)}
                    placeholder="#28A745"
                  />
                  <div 
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: settingsData?.color_primary || "#28A745" }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Secondary Color (Pending/Attention)</Label>
                <div className="flex items-center gap-3">
                  <Input
                    type="color"
                    value={settingsData?.color_secondary || "#FFA500"}
                    onChange={(e) => handleUpdateSettings("color_secondary", e.target.value)}
                    className="w-16 h-10"
                  />
                  <Input
                    value={settingsData?.color_secondary || "#FFA500"}
                    onChange={(e) => handleUpdateSettings("color_secondary", e.target.value)}
                    placeholder="#FFA500"
                  />
                  <div 
                    className="w-10 h-10 rounded border"
                    style={{ backgroundColor: settingsData?.color_secondary || "#FFA500" }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>School Logo</Label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 border rounded flex items-center justify-center bg-muted">
                    {settingsData?.logo_url ? (
                      <img src={settingsData.logo_url} alt="School Logo" className="max-w-full max-h-full" />
                    ) : (
                      <Image className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      value={settingsData?.logo_url || ""}
                      onChange={(e) => handleUpdateSettings("logo_url", e.target.value)}
                      placeholder="Enter logo URL"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter URL to school logo image
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grade Structure */}
        <TabsContent value="grades" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Grade Structure
                </div>
                <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Grade
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Grade</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateGrade} className="space-y-4">
                      <div className="space-y-2">
                        <Label>Grade Name</Label>
                        <Input
                          value={newGradeName}
                          onChange={(e) => setNewGradeName(e.target.value)}
                          placeholder="e.g., Grade 1"
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={createGrade.isPending}>
                        {createGrade.isPending ? "Adding..." : "Add Grade"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {gradesLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading grades...</div>
              ) : !grades?.length ? (
                <div className="text-center py-8 text-muted-foreground">No grades configured</div>
              ) : (
                <div className="space-y-2">
                  {grades.map((grade) => (
                    <div key={grade.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                      <span className="font-medium">{grade.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteGrade(grade.id)}
                        disabled={deleteGrade.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Settings */}
        <TabsContent value="payment" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Payment Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Allow Partial Payments</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable students to pay fees in installments
                  </p>
                </div>
                <Switch
                  checked={settingsData?.allow_partial_payments || false}
                  onCheckedChange={(checked) => handleUpdateSettings("allow_partial_payments", checked)}
                />
              </div>

              <div className="space-y-2">
                <Label>Maximum Installments</Label>
                <Select
                  value={settingsData?.max_installments?.toString() || "3"}
                  onValueChange={(value) => handleUpdateSettings("max_installments", Number(value))}
                  disabled={!settingsData?.allow_partial_payments}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Payment</SelectItem>
                    <SelectItem value="2">2 Installments</SelectItem>
                    <SelectItem value="3">3 Installments</SelectItem>
                    <SelectItem value="4">4 Installments</SelectItem>
                    <SelectItem value="6">6 Installments</SelectItem>
                    <SelectItem value="12">12 Installments</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Maximum number of installments allowed per term
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
