import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Copy, Mail, Plus, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const CATEGORY_LABELS: Record<string, string> = {
  cold_outreach: "Cold Outreach",
  follow_up: "Follow-up",
  quote: "Quote",
  closing: "Closing",
  nurture: "Nurture",
};

export default function EmailTemplates() {
  const { data: templates, isLoading, refetch } = trpc.emailTemplates.list.useQuery();
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [customizedBody, setCustomizedBody] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [formData, setFormData] = useState({ name: "", subject: "", body: "", category: "" });
  
  const createTemplate = trpc.emailTemplates.create.useMutation();
  const updateTemplate = trpc.emailTemplates.update.useMutation();
  const deleteTemplate = trpc.emailTemplates.delete.useMutation();

  const handleCopyTemplate = (template: any) => {
    setSelectedTemplate(template);
    setCustomizedBody(template.body);
  };

  const handleCopyToClipboard = () => {
    if (!selectedTemplate) return;
    
    const emailContent = `Subject: ${selectedTemplate.subject}\n\n${customizedBody}`;
    navigator.clipboard.writeText(emailContent);
    toast.success("Email copied to clipboard!");
  };
  
  const handleCreateTemplate = async () => {
    try {
      await createTemplate.mutateAsync(formData as any);
      toast.success("Template created successfully");
      setIsCreateDialogOpen(false);
      setFormData({ name: "", subject: "", body: "", category: "" });
      refetch();
    } catch (error) {
      toast.error("Failed to create template");
    }
  };
  
  const handleEditTemplate = async () => {
    if (!editingTemplate) return;
    try {
      await updateTemplate.mutateAsync({ id: editingTemplate.id, ...formData } as any);
      toast.success("Template updated successfully");
      setIsEditDialogOpen(false);
      setEditingTemplate(null);
      setFormData({ name: "", subject: "", body: "", category: "" });
      refetch();
    } catch (error) {
      toast.error("Failed to update template");
    }
  };
  
  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await deleteTemplate.mutateAsync({ id });
      toast.success("Template deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };
  
  const openEditDialog = (template: any) => {
    setEditingTemplate(template);
    setFormData({ name: template.name, subject: template.subject, body: template.body, category: template.category });
    setIsEditDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Templates</h1>
            <p className="text-muted-foreground mt-2">
              Pre-written email templates for every stage of your sales process
            </p>
          </div>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Template
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading templates...</div>
        ) : (
          <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
            {templates && templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-primary/10 text-primary">
                          {CATEGORY_LABELS[template.category]}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openEditDialog(template)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDeleteTemplate(template.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Subject:</p>
                      <p className="text-sm">{template.subject}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Preview:</p>
                      <p className="text-sm line-clamp-3 whitespace-pre-wrap">
                        {template.body}
                      </p>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2"
                          onClick={() => handleCopyTemplate(template)}
                        >
                          <Mail className="mr-2 h-4 w-4" />
                          Use Template
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{template.name}</DialogTitle>
                          <DialogDescription>
                            Customize this template and copy to your email client
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div className="space-y-2">
                            <Label>Subject Line</Label>
                            <div className="p-3 bg-muted rounded-md text-sm">
                              {template.subject}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="body">Email Body</Label>
                            <Textarea
                              id="body"
                              value={customizedBody}
                              onChange={(e) => setCustomizedBody(e.target.value)}
                              rows={16}
                              className="font-mono text-sm"
                            />
                            <p className="text-xs text-muted-foreground">
                              Variables: {"{"}{"{"} contactName {"}"}{"}"}, {"{"}{"{"} companyName {"}"}{"}"}, {"{"}{"{"} agentName {"}"}{"}"}, etc.
                            </p>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button onClick={handleCopyToClipboard} className="flex-1">
                            <Copy className="mr-2 h-4 w-4" />
                            Copy to Clipboard
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {templates && templates.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No email templates available</p>
          </Card>
        )}
        
        {/* Create Template Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Email Template</DialogTitle>
              <DialogDescription>Add a new email template for your sales process</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="quote">Quote</SelectItem>
                    <SelectItem value="closing">Closing</SelectItem>
                    <SelectItem value="nurture">Nurture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject">Subject Line</Label>
                <Input id="subject" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="body">Email Body</Label>
                <Textarea id="body" value={formData.body} onChange={(e) => setFormData({...formData, body: e.target.value})} rows={12} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateTemplate}>Create Template</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Edit Template Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Email Template</DialogTitle>
              <DialogDescription>Update this email template</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Template Name</Label>
                <Input id="edit-name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                    <SelectItem value="follow_up">Follow-up</SelectItem>
                    <SelectItem value="quote">Quote</SelectItem>
                    <SelectItem value="closing">Closing</SelectItem>
                    <SelectItem value="nurture">Nurture</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-subject">Subject Line</Label>
                <Input id="edit-subject" value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-body">Email Body</Label>
                <Textarea id="edit-body" value={formData.body} onChange={(e) => setFormData({...formData, body: e.target.value})} rows={12} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleEditTemplate}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
