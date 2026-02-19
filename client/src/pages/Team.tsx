import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Loader2, Shield, User } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";

export default function Team() {
  const { user, loading: authLoading } = useAuth();

  const { data: allUsers, isLoading, refetch } = trpc.users.list.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  const updateRole = trpc.users.updateRole.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  const handleRoleChange = async (userId: number, newRole: "admin" | "user") => {
    if (!user || userId === user.id) {
      toast.error("You cannot change your own role");
      return;
    }
    await updateRole.mutateAsync({ userId, role: newRole });
  };

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="container py-8">
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>Only administrators can view team management.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container py-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Team Management</h1>
          <p className="text-muted-foreground mt-2">
            View and manage team members
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Active Team Members</CardTitle>
            <CardDescription>
              All users with access to the sales tracker
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last Sign In</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allUsers && allUsers.length > 0 ? (
                  allUsers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name || "—"}</TableCell>
                      <TableCell>{member.email || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {member.role === "admin" ? (
                            <>
                              <Shield className="w-4 h-4 text-orange-500" />
                              <span className="text-orange-500 font-medium">Admin</span>
                            </>
                          ) : (
                            <>
                              <User className="w-4 h-4 text-blue-500" />
                              <span className="text-blue-500">User</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {member.lastSignedIn
                          ? new Date(member.lastSignedIn).toLocaleDateString()
                          : "Never"}
                      </TableCell>
                      <TableCell>
                        <Select
                          value={member.role}
                          onValueChange={(value: "admin" | "user") =>
                            handleRoleChange(member.id, value)
                          }
                          disabled={member.id === user.id || updateRole.isPending}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No team members found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle>Note: User Management for Vercel Deployment</CardTitle>
            <CardDescription>
              When you deploy to Vercel with Supabase Auth, you'll be able to create user accounts directly with email and password. For now, team members need Manus accounts to access the system.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </DashboardLayout>
  );
}
