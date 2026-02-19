import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { STAGE_LABELS, STAGES } from "@shared/stages";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Pipeline() {
  const { data: leads, isLoading } = trpc.leads.list.useQuery();

  const leadsByStage = STAGES.reduce((acc, stage) => {
    acc[stage] = leads?.filter((lead) => lead.stage === stage) || [];
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pipeline</h1>
          <p className="text-muted-foreground mt-2">Visual overview of your sales pipeline by stage</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading pipeline...</div>
        ) : (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {STAGES.map((stage) => (
              <Card key={stage} className="flex flex-col">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">
                    {STAGE_LABELS[stage]}
                  </CardTitle>
                  <div className="text-2xl font-bold">{leadsByStage[stage].length}</div>
                </CardHeader>
                <CardContent className="flex-1 space-y-2">
                  {leadsByStage[stage].length > 0 ? (
                    <>
                      {leadsByStage[stage].slice(0, 5).map((lead) => (
                        <Link key={lead.id} href={`/leads/${lead.id}`}>
                          <div className="p-3 rounded-lg border bg-card hover:bg-accent cursor-pointer transition-colors">
                            <p className="font-medium text-sm">{lead.companyName}</p>
                            <p className="text-xs text-muted-foreground">{lead.contactName}</p>
                          </div>
                        </Link>
                      ))}
                      {leadsByStage[stage].length > 5 && (
                        <p className="text-xs text-muted-foreground text-center pt-2">
                          +{leadsByStage[stage].length - 5} more
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No leads</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Pipeline Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total Leads</span>
                <span className="text-sm font-bold">{leads?.length || 0}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Active (Not Closed)</span>
                <span className="text-sm font-bold">
                  {leads?.filter((l) => l.stage !== "closed_won" && l.stage !== "closed_lost").length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-green-600">Closed Won</span>
                <span className="text-sm font-bold text-green-600">
                  {leadsByStage["closed_won"]?.length || 0}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-red-600">Closed Lost</span>
                <span className="text-sm font-bold text-red-600">
                  {leadsByStage["closed_lost"]?.length || 0}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
