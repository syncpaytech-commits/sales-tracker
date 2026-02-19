import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { OPPORTUNITY_STAGE_LABELS } from "@shared/opportunityStages";
import { CALL_OUTCOMES } from "@shared/stages";
import { CLOSED_LOST_REASONS } from "@shared/closedLostReasons";
import { format } from "date-fns";
import { ArrowLeft, Building2, Calendar, DollarSign, Edit, Mail, Phone, Target, TrendingUp, User, Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function OpportunityDetail({ params }: { params: { id: string } }) {
  const opportunityId = parseInt(params.id);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  const utils = trpc.useUtils();
  const { data: opportunity, isLoading, refetch } = trpc.opportunities.getById.useQuery({ id: opportunityId });
  const { data: callLogs } = trpc.calls.byOpportunity.useQuery({ opportunityId });
  const updateOpportunity = trpc.opportunities.update.useMutation();
  const deleteOpportunity = trpc.opportunities.delete.useMutation();
  const createCall = trpc.calls.createForOpportunity.useMutation();
  const { data: notes = [] } = trpc.opportunities.notes.useQuery({ opportunityId });
  const { data: oppCallLogs = [] } = trpc.opportunities.callLogs.useQuery({ opportunityId });
  const createNote = trpc.opportunities.createNote.useMutation();
  
  const [noteInput, setNoteInput] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCallDialogOpen, setIsCallDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    stage: "",
    dealValue: "",
    probability: "",
    expectedCloseDate: "",
    notes: "",
    lossReason: "",
  });

  const [callForm, setCallForm] = useState({
    callOutcome: "" as any,
    callDuration: "",
    notes: "",
    scheduleCallback: false,
    callbackDate: "",
    callbackTime: "",
  });

  useEffect(() => {
    if (opportunity) {
      setEditForm({
        name: opportunity.name,
        stage: opportunity.stage,
        dealValue: opportunity.dealValue || "",
        probability: (opportunity.probability || 50).toString(),
        expectedCloseDate: opportunity.expectedCloseDate 
          ? format(new Date(opportunity.expectedCloseDate), "yyyy-MM-dd") 
          : "",
        notes: opportunity.notes || "",
        lossReason: opportunity.lossReason || "",
      });
    }
  }, [opportunity]);

  const handleLogCall = async () => {
    if (!callForm.callOutcome) {
      toast.error("Please select a call outcome");
      return;
    }

    try {
      const callbackDate = callForm.scheduleCallback && callForm.callbackDate && callForm.callbackTime
        ? new Date(`${callForm.callbackDate}T${callForm.callbackTime}`)
        : undefined;

      await createCall.mutateAsync({
        opportunityId,
        callDate: new Date(),
        callOutcome: callForm.callOutcome,
        callDuration: callForm.callDuration ? parseInt(callForm.callDuration) : undefined,
        notes: callForm.notes || undefined,
        callbackScheduled: callForm.scheduleCallback ? "Yes" : "No",
        callbackDate,
      });

      toast.success("Call logged successfully");
      setIsCallDialogOpen(false);
      setCallForm({
        callOutcome: "" as any,
        callDuration: "",
        notes: "",
        scheduleCallback: false,
        callbackDate: "",
        callbackTime: "",
      });
      refetch();
    } catch (error) {
      toast.error("Failed to log call");
    }
  };

  const handleUpdateOpportunity = async () => {
    try {
      await updateOpportunity.mutateAsync({
        id: opportunityId,
        name: editForm.name,
        stage: editForm.stage as any,
        dealValue: editForm.dealValue || undefined,
        probability: parseInt(editForm.probability),
        expectedCloseDate: editForm.expectedCloseDate ? new Date(editForm.expectedCloseDate) : undefined,
        notes: editForm.notes || undefined,
        lossReason: editForm.lossReason || undefined,
      });
      toast.success("Opportunity updated successfully");
      setIsEditDialogOpen(false);
      refetch();
      // Invalidate analytics cache to refresh metrics
      utils.analytics.metrics.invalidate();
      utils.analytics.opportunityStageDistribution.invalidate();
      utils.opportunities.list.invalidate();
    } catch (error) {
      toast.error("Failed to update opportunity");
    }
  };

  const handleDeleteOpportunity = async () => {
    try {
      await deleteOpportunity.mutateAsync({ id: opportunityId });
      toast.success("Opportunity deleted successfully");
      setLocation("/opportunities");
    } catch (error) {
      toast.error("Failed to delete opportunity");
    }
  };

  const handleAddNote = async () => {
    if (!noteInput.trim()) return;

    try {
      await createNote.mutateAsync({
        opportunityId,
        content: noteInput,
      });
      toast.success("Note added successfully");
      setNoteInput("");
      utils.opportunities.notes.invalidate({ opportunityId });
    } catch (error) {
      toast.error("Failed to add note");
    }
  };

  if (isLoading || !opportunity) {
    return <DashboardLayout><div className="p-8">Loading...</div></DashboardLayout>;
  }

  // Combine notes and call logs into activity log
  const combinedActivity = [
    ...notes.map(note => ({
      type: 'note' as const,
      date: note.createdAt,
      content: note.content,
      userName: note.createdByName,
    })),
    ...oppCallLogs.map(call => ({
      type: 'call' as const,
      date: call.callDate,
      callOutcome: call.callOutcome,
      content: call.notes,
      userName: undefined,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const stageColor = 
    opportunity.stage === "closed_won" ? "text-green-600 bg-green-100" :
    opportunity.stage === "closed_lost" ? "text-red-600 bg-red-100" :
    opportunity.stage === "negotiation" ? "text-orange-600 bg-orange-100" :
    "text-blue-600 bg-blue-100";

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/opportunities")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{opportunity.name}</h1>
              <p className="text-muted-foreground">{opportunity.companyName}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
            <Button variant="outline" onClick={() => setIsCallDialogOpen(true)}>
              <Phone className="h-4 w-4 mr-2" />
              Log Call
            </Button>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Opportunity Info */}
          <Card>
            <CardHeader>
              <CardTitle>Opportunity Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Stage:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${stageColor}`}>
                  {OPPORTUNITY_STAGE_LABELS[opportunity.stage]}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Deal Value:</span>
                <span className="font-medium">{opportunity.dealValue || "Not set"}</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Probability:</span>
                <span className="font-medium">{opportunity.probability}%</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Expected Close:</span>
                <span className="font-medium">
                  {opportunity.expectedCloseDate 
                    ? format(new Date(opportunity.expectedCloseDate), "MMM d, yyyy")
                    : "Not set"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Original Lead:</span>
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-blue-600"
                  onClick={() => setLocation(`/leads/${opportunity.leadId}`)}
                >
                  View Lead #{opportunity.leadId}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Contact:</span>
                <span className="font-medium">{opportunity.contactName}</span>
              </div>
              {opportunity.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Phone:</span>
                  <a href={`tel:${opportunity.phone}`} className="font-medium text-blue-600 hover:underline">
                    {opportunity.phone}
                  </a>
                </div>
              )}
              {opportunity.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Email:</span>
                  <a href={`mailto:${opportunity.email}`} className="font-medium text-blue-600 hover:underline">
                    {opportunity.email}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Notes */}
        {opportunity.notes && (
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{opportunity.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Call History */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Call History</CardTitle>
              <Button size="sm" onClick={() => setIsCallDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Log Call
              </Button>
            </div>
            <CardDescription>All calls logged for this opportunity</CardDescription>
          </CardHeader>
          <CardContent>
            {callLogs && callLogs.length > 0 ? (
              <div className="space-y-4">
                {callLogs.map((call) => (
                  <div key={call.id} className="border-l-2 border-blue-500 pl-4 py-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">{call.callOutcome}</span>
                      <span className="text-sm text-muted-foreground">
                        {format(new Date(call.callDate), "MMM d, yyyy h:mm a")}
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
              <p className="text-sm text-muted-foreground">No calls logged yet</p>
            )}
          </CardContent>
        </Card>

        {/* Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
            <CardDescription>Activity log and notes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Note Input */}
              <div className="flex gap-2">
                <Textarea
                  value={noteInput}
                  onChange={(e) => setNoteInput(e.target.value)}
                  placeholder="Add a note..."
                  rows={2}
                  className="flex-1"
                />
                <Button onClick={handleAddNote} disabled={!noteInput.trim()}>
                  Add Note
                </Button>
              </div>

              {/* Activity Log */}
              <div className="max-h-96 overflow-y-auto space-y-3">
                {combinedActivity.length > 0 ? (
                  combinedActivity.map((item, idx) => (
                    <div key={idx} className="border-l-2 border-gray-300 pl-4 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {item.type === 'call' ? `📞 ${item.callOutcome}` : '📝 Note'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.date), "MMM d, yyyy h:mm a")}
                        </span>
                      </div>
                      {item.content && (
                        <p className="text-sm text-muted-foreground mt-1">{item.content}</p>
                      )}
                      {item.userName && (
                        <p className="text-xs text-muted-foreground mt-1">by {item.userName}</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No activity yet</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Opportunity</DialogTitle>
            <DialogDescription>Update opportunity details and stage</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Deal Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="stage">Stage</Label>
              <Select value={editForm.stage} onValueChange={(value) => setEditForm({ ...editForm, stage: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="qualified">Qualified</SelectItem>
                  <SelectItem value="proposal">Proposal</SelectItem>
                  <SelectItem value="negotiation">Negotiation</SelectItem>
                  <SelectItem value="closed_won">Closed Won</SelectItem>
                  <SelectItem value="closed_lost">Closed Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dealValue">Deal Value</Label>
              <Input
                id="dealValue"
                value={editForm.dealValue}
                onChange={(e) => setEditForm({ ...editForm, dealValue: e.target.value })}
                placeholder="e.g., $50,000"
              />
            </div>
            <div>
              <Label htmlFor="probability">Win Probability (%)</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                value={editForm.probability}
                onChange={(e) => setEditForm({ ...editForm, probability: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
              <Input
                id="expectedCloseDate"
                type="date"
                value={editForm.expectedCloseDate}
                onChange={(e) => setEditForm({ ...editForm, expectedCloseDate: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                rows={4}
              />
            </div>
            {editForm.stage === "closed_lost" && (
              <div>
                <Label htmlFor="lossReason">Closed Lost Reason</Label>
                <Select value={editForm.lossReason} onValueChange={(value) => setEditForm({ ...editForm, lossReason: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLOSED_LOST_REASONS.map((reason) => (
                      <SelectItem key={reason} value={reason}>{reason}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateOpportunity}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Log Call Dialog */}
      <Dialog open={isCallDialogOpen} onOpenChange={setIsCallDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Log Call</DialogTitle>
            <DialogDescription>Record details of your call with this opportunity</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="callOutcome">Call Outcome *</Label>
              <Select value={callForm.callOutcome} onValueChange={(value) => setCallForm({ ...callForm, callOutcome: value as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select outcome" />
                </SelectTrigger>
                <SelectContent>
                  {CALL_OUTCOMES.map((outcome) => (
                    <SelectItem key={outcome} value={outcome}>{outcome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="callDuration">Duration (seconds)</Label>
              <Input
                id="callDuration"
                type="number"
                value={callForm.callDuration}
                onChange={(e) => setCallForm({ ...callForm, callDuration: e.target.value })}
                placeholder="e.g., 120"
              />
            </div>
            <div>
              <Label htmlFor="callNotes">Notes</Label>
              <Textarea
                id="callNotes"
                value={callForm.notes}
                onChange={(e) => setCallForm({ ...callForm, notes: e.target.value })}
                rows={3}
                placeholder="Add any notes about the call..."
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="scheduleCallback"
                checked={callForm.scheduleCallback}
                onChange={(e) => setCallForm({ ...callForm, scheduleCallback: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="scheduleCallback">Schedule Callback</Label>
            </div>
            {callForm.scheduleCallback && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="callbackDate">Callback Date</Label>
                  <Input
                    id="callbackDate"
                    type="date"
                    value={callForm.callbackDate}
                    onChange={(e) => setCallForm({ ...callForm, callbackDate: e.target.value })}
                  />
                </div>
                <div>
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
            <Button onClick={handleLogCall}>Log Call</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Opportunity</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{opportunity.name}</strong> for {opportunity.companyName}? 
              This action cannot be undone. All associated call logs will also be deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteOpportunity}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Opportunity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
