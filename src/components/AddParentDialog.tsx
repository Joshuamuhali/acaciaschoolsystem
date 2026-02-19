import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { useCreateParent } from "@/hooks/useParents";

export default function AddParentDialog() {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [account, setAccount] = useState("");
  const create = useCreateParent();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { full_name: fullName, phone_number: phone || null, account_number: account || null },
      { onSuccess: () => { setOpen(false); setFullName(""); setPhone(""); setAccount(""); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4 mr-2" /> Add Parent</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Add Parent</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label>Account / Airtel Number</Label>
            <Input value={account} onChange={(e) => setAccount(e.target.value)} placeholder="Optional" />
          </div>
          <Button type="submit" className="w-full" disabled={create.isPending}>
            {create.isPending ? "Creating..." : "Create Parent"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
