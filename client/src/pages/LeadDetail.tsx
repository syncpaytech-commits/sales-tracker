import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CALL_OUTCOMES, STAGE_LABELS, STAGES } from "@shared/stages";
import { format } from "date-fns";
import { ArrowLeft, Phone, Plus, Target, CheckCircle2, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import ConvertToOpportunityDialog from "@/components/ConvertToOpportunityDialog";

export default function LeadDetail({ params }: { params: { id: string } }) {
  const leadId = parseInt(params.id);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const { data: lead, isLoading, refetch } = trpc.leads.getById.useQuery({ id: leadId });
  const { data: callLogs } = trpc.calls.byLead.useQuery({ leadId });
  const { data: notes, refetch: refetchNotes } = trpc.notes.byLead.useQuery({ leadId });
  const updateLead = trpc.leads.update.useMutation();
  const createCall = trpc.calls.create.useMutation();
  const createNote = trpc.notes.create.useMutation();
  const deleteLead = trpc.leads.delete.useMutation();
  
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [callForm, setCallForm] = useState({
    callOutcome: "" as any,
    callDuration: "",
    notes: "",
    scheduleCallback: false,
    callbackDate: "",
    callbackTime: "",
  });

  const [editForm, setEditForm] = useState({
    stage: lead?.stage || "",
    nextFollowUpDate: lead?.nextFollowUpDate ? format(new Date(lead.nextFollowUpDate), "yyyy-MM-dd") : "",
    phone: lead?.phone || "",
    email: lead?.email || "",
  });

  const handleLogCall = async () => {
    if (!callForm.callOutcome) {
      toast.error("Please select a call outcome");
      return;
    }

    try {
      const callbackDateTime = callForm.scheduleCallback && callForm.callbackDate
        ? new Date(`${callForm.callbackDate}T${callForm.callbackTime || '09:00'}:00`)
        : undefined;
      
      await createCall.mutateAsync({
        leadId,
        callDate: new Date(),
        callOutcome: callForm.callOutcome,
        callDuration: callForm.callDuration ? parseInt(callForm.callDuration) : undefined,
        notes: callForm.notes || undefined,
        callbackScheduled: callForm.scheduleCallback ? "Yes" : "No",
        callbackDate: callbackDateTime,
      });
      toast.success(callForm.scheduleCallback ? "Call logged and callback scheduled" : "Call logged successfully");
      setIsCallDialogOpen(false);
      setCallForm({ callOutcome: "" as any, callDuration: "", notes: "", scheduleCallback: false, callbackDate: "", callbackTime: "" });
      refetch();
    } catch (error) {
      toast.error("Failed to log call");
    }
  };

  const handleUpdateLead = async () => {
    try {
      await updateLead.mutateAsync({
        id: leadId,
        data: {
          stage: editForm.stage as any,
          nextFollowUpDate: editForm.nextFollowUpDate ? new Date(editForm.nextFollowUpDate) : undefined,
          phone: editForm.phone || undefined,
          email: editForm.email || undefined,
        },
      });
      toast.success("Lead updated successfully");
      setIsEditDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to update lead");
    }
  };

  const handleDeleteLead = async () => {
    try {
      await deleteLead.mutateAsync({ id: leadId });
      toast.success("Lead deleted successfully");
      setLocation("/leads");
    } catch (error) {
      toast.error("Failed to delete lead");
    }
  };
  
  const handleAddNote = async () => {
    if (!noteContent.trim()) {
      toast.error("Note content cannot be empty");
      return;
    }
    try {
      await createNote.mutateAsync({ leadId, content: noteContent });
      toast.success("Note added successfully");
      setNoteContent("");
      refetchNotes();
    } catch (error) {
      toast.error("Failed to add note");
    }
  };

  if (isLoading || !lead) {
    return <DashboardLayout><div className="p-8">Loading...</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/leads")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">{lead.companyName}</h1>
                <p className="text-muted-foreground mt-1">{lead.contactName}</p>
              </div>
              {lead.convertedToOpportunity === "Yes" && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Converted to Opportunity
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Lead
            </Button>
            {lead.convertedToOpportunity !== "Yes" && (
              <Button variant="outline" onClick={() => setIsConvertDialogOpen(true)}>
                <Target className="mr-2 h-4 w-4" />
                Convert to Opportunity
              </Button>
            )}
            <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Phone className="mr-2 h-4 w-4" />
                  Log Call
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Log Call</DialogTitle>
                  <DialogDescription>
                    Current Stage: <span className="font-semibold">{STAGE_LABELS[lead.stage]}</span>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium mb-2">📍 Stage Progression Guide:</p>
                    <ul className="space-y-1 text-xs">
                      <li>• <strong>No Answer/Gatekeeper</strong> → Attempting</li>
                      <li>• <strong>DM Reached/Callback</strong> → DM Engaged</li>
                      <li>• <strong>Email Requested</strong> → Email Sent</li>
                      <li>• <strong>Statement Agreed</strong> → Statement Requested</li>
                      <li>• <strong>Not Interested/Bad Data</strong> → Closed Lost</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="callOutcome">Call Outcome (Auto-advances stage) *</Label>
                    <Select value={callForm.callOutcome} onValueChange={(value) => setCallForm({ ...callForm, callOutcome: value as any })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select outcome" />
                      </SelectTrigger>
                      <SelectContent>
                        {CALL_OUTCOMES.map((outcome) => {
                          const outcomeToStageMap: Record<string, string> = {
                            "No Answer": "→ Attempting",
                            "Gatekeeper": "→ Attempting",
                            "DM Reached": "→ DM Engaged",
                            "Callback Requested": "→ DM Engaged",
                            "Email Requested": "→ Email Sent",
                            "Statement Agreed": "→ Statement Requested",
                            "Not Interested": "→ Closed Lost",
                            "Bad Data": "→ Closed Lost",
                          };
                          return (
                            <SelectItem key={outcome} value={outcome}>
                              {outcome} {outcomeToStageMap[outcome] || ""}
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="callDuration">Call Duration (seconds)</Label>
                    <Input
                      id="callDuration"
                      type="number"
                      value={callForm.callDuration}
                      onChange={(e) => setCallForm({ ...callForm, callDuration: e.target.value })}
                      placeholder="120"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={callForm.notes}
                      onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
                      placeholder="Add any relevant notes..."
                      rows={4}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="scheduleCallback"
                      checked={callForm.scheduleCallback}
                      onChange={(e) => setCallForm({ ...callForm, scheduleCallback: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="scheduleCallback" className="cursor-pointer">Schedule a callback</Label>
                  </div>
                  {callForm.scheduleCallback && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="callbackDate">Callback Date</Label>
                        <Input
                          id="callbackDate"
                          type="date"
                          value={callForm.callbackDate}
                          onChange={(e) => setCallForm({ ...callForm, callbackDate: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="callbackTime">Callback Time</Label>
                        <Input
                          id="callbackTime"
                          type="time"
                          value={callForm.callbackTime}
                          onChange={(e) => setCallForm({ ...callForm, callbackTime: e.target.value })}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCallDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleLogCall} disabled={createCall.isPending}>
                    {createCall.isPending ? "Logging..." : "Log Call"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">Edit Lead</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Lead</DialogTitle>
                  <DialogDescription>Update lead information</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="stage">Stage</Label>
                    <Select value={editForm.stage} onValueChange={(value) => setEditForm({ ...editForm, stage: value })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STAGES.map((stage) => (
                          <SelectItem key={stage} value={stage}>{STAGE_LABELS[stage]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nextFollowUpDate">Next Follow-up Date</Label>
                    <Input
                      id="nextFollowUpDate"
                      type="date"
                      value={editForm.nextFollowUpDate}
                      onChange={(e) => setEditForm({ ...editForm, nextFollowUpDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
                  <Button onClick={handleUpdateLead} disabled={updateLead.isPending}>
                    {updateLead.isPending ? "Updating..." : "Update Lead"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Lead Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Company</Label>
                <p className="font-medium">{lead.companyName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Contact</Label>
                <p className="font-medium">{lead.contactName}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Phone</Label>
                <p className="font-medium">{lead.phone || "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{lead.email || "N/A"}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Stage</Label>
                <p className="font-medium">{STAGE_LABELS[lead.stage]}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Dial Attempts</Label>
                <p className="font-medium">{lead.dialAttempts}</p>
              </div>
              {lead.nextFollowUpDate && (
                <div>
                  <Label className="text-muted-foreground">Next Follow-up</Label>
                  <p className="font-medium">{format(new Date(lead.nextFollowUpDate), "PPP")}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.dataSource && (
                <div>
                  <Label className="text-muted-foreground">Data Source</Label>
                  <p className="font-medium">{lead.dataSource}</p>
                </div>
              )}
              {lead.dataCohort && (
                <div>
                  <Label className="text-muted-foreground">Data Cohort</Label>
                  <p className="font-medium">{lead.dataCohort}</p>
                </div>
              )}
              {lead.provider && (
                <div>
                  <Label className="text-muted-foreground">Provider</Label>
                  <p className="font-medium">{lead.provider}</p>
                </div>
              )}
              {lead.processingVolume && (
                <div>
                  <Label className="text-muted-foreground">Processing Volume</Label>
                  <p className="font-medium">{lead.processingVolume}</p>
                </div>
              )}
              {lead.effectiveRate && (
                <div>
                  <Label className="text-muted-foreground">Effective Rate</Label>
                  <p className="font-medium">{lead.effectiveRate}</p>
                </div>
              )}
              
              {/* Activity Log - Notes & Call Notes */}
              <div className="mt-6 pt-6 border-t">
                <Label className="text-muted-foreground mb-3 block">Activity Log</Label>
                
                {/* Add Note Input */}
                <div className="mb-4 space-y-2">
                  <Textarea
                    placeholder="Add a note..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                  <Button 
                    onClick={handleAddNote} 
                    size="sm" 
                    disabled={!noteContent.trim()}
                    className="w-full"
                  >
                    Add Note
                  </Button>
                </div>
                
                {/* Combined Activity Feed */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {/* Standalone Notes */}
                  {notes && notes.map((note) => (
                    <div key={`note-${note.id}`} className="bg-muted/50 rounded-lg p-3 border-l-2 border-blue-500">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-blue-600">Note</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">by {note.createdByName}</p>
                    </div>
                  ))}
                  
                  {/* Call Notes */}
                  {callLogs && callLogs.filter(call => call.notes).map((call) => (
                    <div key={`call-${call.id}`} className="bg-muted/50 rounded-lg p-3 border-l-2 border-primary">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-xs font-medium text-primary">{call.callOutcome}</span>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {format(new Date(call.callDate), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      <p className="text-sm">{call.notes}</p>
                    </div>
                  ))}
                  
                  {(!notes || notes.length === 0) && (!callLogs || callLogs.filter(c => c.notes).length === 0) && (
                    <p className="text-muted-foreground text-center py-4 text-sm">No activity yet</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Call History</CardTitle>
            <CardDescription>All calls made to this lead</CardDescription>
          </CardHeader>
          <CardContent>
            {callLogs && callLogs.length > 0 ? (
              <div className="space-y-4">
                {callLogs.map((call) => (
                  <div key={call.id} className="border-l-2 border-primary pl-4 py-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{call.callOutcome}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(call.callDate), "PPp")}
                      </span>
                    </div>
                    {call.callDuration && (
                      <p className="text-sm text-muted-foreground">Duration: {call.callDuration}s</p>
                    )}
                    {call.notes && (
                      <p className="text-sm mt-2">{call.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">No calls logged yet</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <ConvertToOpportunityDialog
        open={isConvertDialogOpen}
        onOpenChange={setIsConvertDialogOpen}
        lead={{
          id: lead.id,
          companyName: lead.companyName,
          contactName: lead.contactName,
          phone: lead.phone || undefined,
          email: lead.email || undefined,
        }}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lead</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{lead.companyName}</strong>? This action cannot be undone.
              All associated call logs and tasks will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteLead}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
