import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useCreateGrade } from "@/hooks/useGrades";

export default function AddGradeDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const createGrade = useCreateGrade();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createGrade.mutate(name, {
      onSuccess: () => { setOpen(false); setName(""); },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-1" /> Add Grade
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Grade</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Grade Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grade 1" required />
          </div>
          <Button type="submit" className="w-full" disabled={createGrade.isPending}>
            {createGrade.isPending ? "Creating..." : "Create Grade"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
