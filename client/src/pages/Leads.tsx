import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { STAGE_LABELS } from "@shared/stages";
import { Download, Mail, Phone, Plus, Search, Upload, FileSpreadsheet, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { Link } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BulkImportDialog } from "@/components/BulkImportDialog";

export default function Leads() {
  const { user } = useAuth();
  const [hideConverted, setHideConverted] = useState(true);
  const { data: leads, isLoading, refetch } = trpc.leads.list.useQuery({ hideConverted });
  const createLead = trpc.leads.create.useMutation();
  const { data: allUsers } = trpc.users.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const bulkAssign = trpc.leads.bulkAssign.useMutation();
  const bulkDelete = trpc.leads.bulkDelete.useMutation();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [assignToUserId, setAssignToUserId] = useState<number | null>(null);
  const [newLead, setNewLead] = useState({
    companyName: "",
    contactName: "",
    phone: "",
    email: "",
    dataSource: "",
    dataCohort: "",
  });

  const filteredLeads = leads?.filter((lead) => {
    const matchesSearch = 
      lead.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (lead.email && lead.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (lead.phone && lead.phone.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStage = stageFilter === "all" || lead.stage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

  const handleCreateLead = async () => {
    if (!newLead.companyName || !newLead.contactName) {
      toast.error("Company name and contact name are required");
      return;
    }

    try {
      await createLead.mutateAsync({
        ...newLead,
        ownerId: user!.id,
      });
      toast.success("Lead created successfully");
      setIsDialogOpen(false);
      setNewLead({
        companyName: "",
        contactName: "",
        phone: "",
        email: "",
        dataSource: "",
        dataCohort: "",
      });
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to create lead");
    }
  };

  const handleBulkAssign = async () => {
    if (!assignToUserId) {
      toast.error("Please select an agent");
      return;
    }
    if (selectedLeads.length === 0) {
      toast.error("Please select leads to assign");
      return;
    }

    try {
      const result = await bulkAssign.mutateAsync({
        leadIds: selectedLeads,
        newOwnerId: assignToUserId,
      });
      toast.success(`Successfully assigned ${result.assigned} leads`);
      setIsBulkAssignOpen(false);
      setSelectedLeads([]);
      setAssignToUserId(null);
      refetch();
    } catch (error: any) {
      toast.error(error.message || "Failed to assign leads");
    }
  };

  const toggleSelectLead = (leadId: number) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedLeads.length === filteredLeads?.length) {
      setSelectedLeads([]);
    } else {
      setSelectedLeads(filteredLeads?.map(l => l.id) || []);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
            <p className="text-muted-foreground mt-2">Manage your sales leads and contacts</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            {selectedLeads.length > 0 && (
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                onClick={async () => {
                  if (confirm(`Are you sure you want to delete ${selectedLeads.length} lead(s)? This action cannot be undone.`)) {
                    try {
                      const result = await bulkDelete.mutateAsync({ leadIds: selectedLeads });
                      toast.success(`Deleted ${result.deletedCount} lead(s)`);
                      setSelectedLeads([]);
                      refetch();
                    } catch (error) {
                      toast.error("Failed to delete leads");
                    }
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete ({selectedLeads.length})
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                if (!leads || leads.length === 0) {
                  toast.error("No leads to export");
                  return;
                }
                const exportLeads = leads.map(lead => ({
                  "Company Name": lead.companyName,
                  "Contact Name": lead.contactName,
                  "Phone": lead.phone || "",
                  "Email": lead.email || "",
                  "Stage": STAGE_LABELS[lead.stage],
                  "Provider": lead.provider || "",
                  "Processing Volume": lead.processingVolume || "",
                  "Effective Rate": lead.effectiveRate || "",
                  "Data Source": lead.dataSource || "",
                  "Data Cohort": lead.dataCohort || "",
                  "Owner ID": lead.ownerId,
                }));
                const ws = XLSX.utils.json_to_sheet(exportLeads);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Leads");
                XLSX.writeFile(wb, `leads-${new Date().toISOString().split("T")[0]}.xlsx`);
                toast.success("Leads exported to Excel");
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Export Excel
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Lead
                </Button>
              </DialogTrigger>
              <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Lead</DialogTitle>
                <DialogDescription>Enter the lead information below</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    value={newLead.companyName}
                    onChange={(e) => setNewLead({ ...newLead, companyName: e.target.value })}
                    placeholder="Acme Corp"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name *</Label>
                  <Input
                    id="contactName"
                    value={newLead.contactName}
                    onChange={(e) => setNewLead({ ...newLead, contactName: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newLead.phone}
                    onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                    placeholder="+1 234 567 8900"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newLead.email}
                    onChange={(e) => setNewLead({ ...newLead, email: e.target.value })}
                    placeholder="john@acme.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataSource">Data Source</Label>
                  <Input
                    id="dataSource"
                    value={newLead.dataSource}
                    onChange={(e) => setNewLead({ ...newLead, dataSource: e.target.value })}
                    placeholder="LinkedIn, Referral, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dataCohort">Data Cohort</Label>
                  <Input
                    id="dataCohort"
                    value={newLead.dataCohort}
                    onChange={(e) => setNewLead({ ...newLead, dataCohort: e.target.value })}
                    placeholder="Test 1, Test 2, etc."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateLead} disabled={createLead.isPending}>
                  {createLead.isPending ? "Creating..." : "Create Lead"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setIsBulkImportOpen(true)} variant="outline" className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            <span className="hidden sm:inline">Bulk Import</span>
          </Button>
          {user?.role === "admin" && selectedLeads.length > 0 && (
            <Button onClick={() => setIsBulkAssignOpen(true)} variant="secondary" className="gap-2">
              <Upload className="h-4 w-4" />
              Assign ({selectedLeads.length})
            </Button>
          )}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter Leads</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company, contact, email, or phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
                {searchQuery && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Found {filteredLeads?.length || 0} lead{filteredLeads?.length !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by stage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stages</SelectItem>
                  {Object.entries(STAGE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="hideConverted" 
                checked={hideConverted}
                onCheckedChange={(checked) => setHideConverted(checked as boolean)}
              />
              <label
                htmlFor="hideConverted"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                Hide converted leads (leads that became opportunities)
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Desktop Table View */}
        <Card className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                {user?.role === "admin" && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedLeads.length === filteredLeads?.length && filteredLeads.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                )}
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Dial Attempts</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={user?.role === "admin" ? 8 : 7} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredLeads && filteredLeads.length > 0 ? (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    {user?.role === "admin" && (
                      <TableCell>
                        <Checkbox
                          checked={selectedLeads.includes(lead.id)}
                          onCheckedChange={() => toggleSelectLead(lead.id)}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {lead.companyName}
                        {lead.opportunityId && (
                          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            Converted
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{lead.contactName}</TableCell>
                    <TableCell>{lead.phone || "-"}</TableCell>
                    <TableCell>{lead.email || "-"}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                        {STAGE_LABELS[lead.stage]}
                      </span>
                    </TableCell>
                    <TableCell>{lead.dialAttempts}</TableCell>
                    <TableCell>
                      <Link href={`/leads/${lead.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={user?.role === "admin" ? 8 : 7} className="text-center py-8 text-muted-foreground">
                    No leads found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-4">
          {isLoading ? (
            <Card className="p-8 text-center">Loading...</Card>
          ) : filteredLeads && filteredLeads.length > 0 ? (
            filteredLeads.map((lead) => (
              <Card key={lead.id} className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{lead.companyName}</h3>
                    <p className="text-sm text-muted-foreground">{lead.contactName}</p>
                  </div>
                  <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                    {STAGE_LABELS[lead.stage]}
                  </span>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  {lead.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{lead.phone}</span>
                    </div>
                  )}
                  {lead.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{lead.email}</span>
                    </div>
                  )}
                  <div className="text-muted-foreground">
                    Dial Attempts: {lead.dialAttempts}
                  </div>
                </div>
                <Link href={`/leads/${lead.id}`}>
                  <Button className="w-full" size="sm">View Details</Button>
                </Link>
              </Card>
            ))
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              No leads found
            </Card>
          )}
        </div>
      </div>
      
      <BulkImportDialog
        open={isBulkImportOpen}
        onOpenChange={setIsBulkImportOpen}
        onSuccess={() => refetch()}
      />
      
      <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Assign Leads</DialogTitle>
            <DialogDescription>
              Assign {selectedLeads.length} selected lead(s) to an agent
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="assignAgent">Select Agent</Label>
              <Select
                value={assignToUserId?.toString()}
                onValueChange={(value) => setAssignToUserId(parseInt(value))}
              >
                <SelectTrigger id="assignAgent">
                  <SelectValue placeholder="Choose an agent" />
                </SelectTrigger>
                <SelectContent>
                  {allUsers?.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name || u.email || `User ${u.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAssign} disabled={bulkAssign.isPending}>
              {bulkAssign.isPending ? "Assigning..." : "Assign Leads"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
