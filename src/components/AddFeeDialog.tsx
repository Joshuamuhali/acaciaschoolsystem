import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { useCreateFee } from "@/hooks/useFees";
import { useGrades } from "@/hooks/useGrades";

export default function AddFeeDialog() {
  const [open, setOpen] = useState(false);
  const [gradeId, setGradeId] = useState("");
  const [term, setTerm] = useState("");
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [amount, setAmount] = useState("");
  const create = useCreateFee();
  const { data: grades } = useGrades();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { grade_id: gradeId, term_number: Number(term), year: Number(year), amount: Number(amount) },
      { onSuccess: () => { setOpen(false); setGradeId(""); setTerm(""); setAmount(""); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Fee</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Fee Structure</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Grade</Label>
            <Select value={gradeId} onValueChange={setGradeId}>
              <SelectTrigger><SelectValue placeholder="Select grade" /></SelectTrigger>
              <SelectContent>
                {grades?.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Term</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger><SelectValue placeholder="Select term" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Term 1</SelectItem>
                <SelectItem value="2">Term 2</SelectItem>
                <SelectItem value="3">Term 3</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Year</Label>
            <Input type="number" value={year} onChange={(e) => setYear(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Amount (K)</Label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? "Creating..." : "Create Fee Structure"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
