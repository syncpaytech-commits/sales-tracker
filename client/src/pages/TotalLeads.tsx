import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { STAGE_LABELS } from "@shared/stages";
import { Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function TotalLeads() {
  const { user } = useAuth();
  const { data: leads, isLoading, refetch } = trpc.leads.list.useQuery();
  const { data: allUsers } = trpc.users.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const bulkAssign = trpc.leads.bulkAssign.useMutation();
  
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<number | null>(null);

  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="p-8">
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">This page is only available to administrators.</p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const handleRangeAssign = async () => {
    if (!selectedAgent) {
      toast.error("Please select an agent");
      return;
    }

    const start = parseInt(rangeStart);
    const end = parseInt(rangeEnd);

    if (isNaN(start) || isNaN(end)) {
      toast.error("Please enter valid numbers");
      return;
    }

    if (start < 1 || end < start || end > (leads?.length || 0)) {
      toast.error(`Please enter a valid range (1-${leads?.length || 0})`);
      return;
    }

    // Get lead IDs for the range
    const leadIds = leads?.slice(start - 1, end).map(l => l.id) || [];

    try {
      const result = await bulkAssign.mutateAsync({
        leadIds,
        newOwnerId: selectedAgent,
      });
      toast.success(`Successfully assigned ${result.assigned} leads (${start}-${end})`);
      setRangeStart("");
      setRangeEnd("");
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign leads");
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Total Leads</h1>
            <p className="text-muted-foreground">Excel-style view with bulk assignment by number range</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Quick Range Assignment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              <div className="space-y-2">
                <Label htmlFor="rangeStart">From Lead #</Label>
                <Input
                  id="rangeStart"
                  type="number"
                  min="1"
                  max={leads?.length || 0}
                  placeholder="1"
                  value={rangeStart}
                  onChange={(e) => setRangeStart(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rangeEnd">To Lead #</Label>
                <Input
                  id="rangeEnd"
                  type="number"
                  min="1"
                  max={leads?.length || 0}
                  placeholder={leads?.length?.toString() || "100"}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="agent">Assign To Agent</Label>
                <Select
                  value={selectedAgent?.toString()}
                  onValueChange={(value) => setSelectedAgent(parseInt(value))}
                >
                  <SelectTrigger id="agent">
                    <SelectValue placeholder="Select agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {allUsers?.map((u) => (
                      <SelectItem key={u.id} value={u.id.toString()}>
                        {u.name || u.email} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={handleRangeAssign} 
                disabled={bulkAssign.isPending}
                className="md:col-span-2"
              >
                {bulkAssign.isPending ? "Assigning..." : "Assign Range"}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">
              Total leads: <strong>{leads?.length || 0}</strong>. Enter a range like "1-50" to assign leads 1 through 50.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Leads (Spreadsheet View)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading leads...</p>
            ) : !leads || leads.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No leads found</p>
            ) : (
              <div className="border rounded-lg overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-16">#</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Dials</TableHead>
                      <TableHead>Owner</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((lead, index) => {
                      const owner = allUsers?.find(u => u.id === lead.ownerId);
                      return (
                        <TableRow key={lead.id} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-sm font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">{lead.companyName}</TableCell>
                          <TableCell>{lead.contactName}</TableCell>
                          <TableCell className="font-mono text-sm">{lead.phone || "—"}</TableCell>
                          <TableCell className="text-sm">{lead.email || "—"}</TableCell>
                          <TableCell>
                            <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                              {STAGE_LABELS[lead.stage]}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">{lead.dialAttempts}</TableCell>
                          <TableCell className="text-sm">
                            {owner?.name || owner?.email || "Unassigned"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
