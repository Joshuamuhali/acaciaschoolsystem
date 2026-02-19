import PageHeader from "@/components/PageHeader";
import AddGradeDialog from "@/components/AddGradeDialog";
import UserManagement from "@/components/UserManagement";
import { useGrades, useDeleteGrade } from "@/hooks/useGrades";
import { useUserRole } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SettingsPage() {
  const { data: grades, isLoading } = useGrades();
  const deleteGrade = useDeleteGrade();
  const { role: currentUserRole } = useUserRole();

  return (
    <div>
      <PageHeader title="Settings" description="Manage system users, grades, and configuration" />

      <Tabs defaultValue="grades" className="space-y-6">
        <TabsList>
          <TabsTrigger value="grades">Grades</TabsTrigger>
          {currentUserRole === "SuperAdmin" && (
            <TabsTrigger value="users">User Management</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="grades" className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold font-display text-foreground">Grades</h2>
              <AddGradeDialog />
            </div>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : !grades?.length ? (
              <p className="text-sm text-muted-foreground">No grades configured</p>
            ) : (
              <ul className="space-y-2">
                {grades.map((g) => (
                  <li key={g.id} className="flex items-center justify-between px-3 py-2 bg-muted/50 rounded-lg">
                    <span className="text-sm font-medium text-foreground">{g.name}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteGrade.mutate(g.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        {currentUserRole === "SuperAdmin" && (
          <TabsContent value="users">
            <UserManagement />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
