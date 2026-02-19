import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface ConvertToOpportunityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: {
    id: number;
    companyName: string;
    contactName: string;
    phone?: string;
    email?: string;
  };
}

export default function ConvertToOpportunityDialog({
  open,
  onOpenChange,
  lead,
}: ConvertToOpportunityDialogProps) {
  const [, setLocation] = useLocation();
  const [dealName, setDealName] = useState(`${lead.companyName} - Deal`);
  const [dealValue, setDealValue] = useState("");
  const [expectedCloseDate, setExpectedCloseDate] = useState("");
  const [notes, setNotes] = useState("");
  const [converting, setConverting] = useState(false);

  const createOpportunity = trpc.opportunities.create.useMutation();

  const handleConvert = async () => {
    if (!dealName.trim()) {
      toast.error("Deal name is required");
      return;
    }

    setConverting(true);
    try {
      const result = await createOpportunity.mutateAsync({
        leadId: lead.id,
        name: dealName,
        companyName: lead.companyName,
        contactName: lead.contactName,
        phone: lead.phone,
        email: lead.email,
        dealValue: dealValue || undefined,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
        notes: notes || undefined,
      });

      toast.success("Lead converted to opportunity!");
      onOpenChange(false);
      
      // Navigate to the new opportunity
      setLocation(`/opportunities/${result.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to convert lead");
    } finally {
      setConverting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Convert to Opportunity</DialogTitle>
          <DialogDescription>
            Create a qualified opportunity from this lead to track the deal through your sales pipeline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="dealName">Deal Name *</Label>
            <Input
              id="dealName"
              value={dealName}
              onChange={(e) => setDealName(e.target.value)}
              placeholder="e.g., Acme Corp - Payment Processing"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dealValue">Deal Value ($)</Label>
            <Input
              id="dealValue"
              type="number"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              placeholder="50000"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="expectedClose">Expected Close Date</Label>
            <Input
              id="expectedClose"
              type="date"
              value={expectedCloseDate}
              onChange={(e) => setExpectedCloseDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any relevant notes about this opportunity..."
              rows={3}
            />
          </div>

          <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
            <p><strong>Company:</strong> {lead.companyName}</p>
            <p><strong>Contact:</strong> {lead.contactName}</p>
            {lead.email && <p><strong>Email:</strong> {lead.email}</p>}
            {lead.phone && <p><strong>Phone:</strong> {lead.phone}</p>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={converting}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={converting}>
            {converting ? "Converting..." : "Convert to Opportunity"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
