import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { Trash2, AlertCircle } from "lucide-react";

export default function Deleted() {
  const { user } = useAuth();
  const { data: auditLogs, isLoading } = trpc.auditLogs.list.useQuery();

  // Only admins can access this page
  if (user?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="p-8">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>Access denied. This page is only available to administrators.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Deleted Items</h1>
            <p className="text-muted-foreground mt-2">Audit log of all deleted leads and opportunities</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Deletion History
            </CardTitle>
            <CardDescription>
              Track who deleted what and when for accountability and recovery purposes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !auditLogs || auditLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No deletion records found</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Deleted By</TableHead>
                    <TableHead>Deleted At</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          log.entityType === 'lead' 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                            : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                        }`}>
                          {log.entityType === 'lead' ? 'Lead' : 'Opportunity'}
                        </span>
                      </TableCell>
                      <TableCell className="font-medium">{log.entityName}</TableCell>
                      <TableCell>{log.deletedByName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(log.deletedAt), "MMM d, yyyy 'at' h:mm a")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {log.additionalInfo ? (
                          <details className="cursor-pointer">
                            <summary className="text-blue-600 hover:underline">View details</summary>
                            <pre className="mt-2 text-xs bg-muted p-2 rounded overflow-auto max-w-md">
                              {JSON.stringify(JSON.parse(log.additionalInfo), null, 2)}
                            </pre>
                          </details>
                        ) : (
                          <span className="text-muted-foreground">No additional info</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
