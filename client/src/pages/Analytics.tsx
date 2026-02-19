import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { STAGE_LABELS } from "@shared/stages";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF6B9D", "#C0C0C0", "#FFD700", "#FF69B4"];

export default function Analytics() {
  const { user } = useAuth();
  const { data: metrics, isLoading } = trpc.analytics.metrics.useQuery();
  const { data: stageDistribution } = trpc.analytics.stageDistribution.useQuery();
  const { data: opportunityStageDistribution } = trpc.analytics.opportunityStageDistribution.useQuery();
  const { data: agentMetrics } = trpc.analytics.agentMetrics.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const funnelData = [
    { stage: "Leads", count: metrics?.totalLeads || 0 },
    { stage: "DM Reached", count: Math.round((metrics?.totalLeads || 0) * (metrics?.dmRate || 0) / 100) },
    { stage: "Statement", count: Math.round((metrics?.totalLeads || 0) * (metrics?.statementRate || 0) / 100) },
    { stage: "Quoted", count: Math.round((metrics?.totalLeads || 0) * (metrics?.quoteRate || 0) / 100) },
    { stage: "Won", count: Math.round((metrics?.totalLeads || 0) * (metrics?.closeRate || 0) / 100) },
  ];

  const stageChartData = stageDistribution?.map((item) => ({
    stage: STAGE_LABELS[item.stage] || item.stage,
    count: item.count,
  })) || [];

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-2">Comprehensive metrics and performance insights</p>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading analytics...</div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.totalLeads || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Dials</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics?.totalDials || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Connect Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(metrics?.connectRate || 0).toFixed(1)}%</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Close Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(metrics?.closeRate || 0).toFixed(1)}%</div>
                </CardContent>
              </Card>
            </div>

            {/* Conversion Metrics */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">DM Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(metrics?.dmRate || 0).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Decision maker reached</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Statement Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(metrics?.statementRate || 0).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Statements agreed</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Quote Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(metrics?.quoteRate || 0).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Quotes sent</p>
                </CardContent>
              </Card>
            </div>

            {/* Opportunity Metrics */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Opportunity Pipeline</h2>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Opportunities</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metrics?.totalOpportunities || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Lead → Opportunity Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(metrics?.leadToOpportunityRate || 0).toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">Conversion rate</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Opportunity Win Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{(metrics?.opportunityWinRate || 0).toFixed(1)}%</div>
                    <p className="text-xs text-muted-foreground">Closed won</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">${(metrics?.totalPipelineValue || 0).toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground">Active deals</p>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Revenue Metrics */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total MRR Added</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(metrics?.totalMRR || 0).toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average Residual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(metrics?.avgResidual || 0).toFixed(2)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">End-to-End Conversion</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{(metrics?.endToEndConversion || 0).toFixed(1)}%</div>
                  <p className="text-xs text-muted-foreground">Lead to close</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Average Deal Size</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(metrics?.avgDealSize || 0).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Per opportunity</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Forecasted Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${(metrics?.forecastedRevenue || 0).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">Weighted pipeline</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Funnel Chart</CardTitle>
                  <CardDescription>Lead progression through pipeline</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={funnelData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Stage Distribution</CardTitle>
                  <CardDescription>Leads by current stage</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={stageChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.stage}: ${entry.count}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {stageChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Opportunities by Stage</CardTitle>
                  <CardDescription>Breakdown of opportunities in pipeline</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={opportunityStageDistribution?.map(item => ({
                      stage: item.stage.charAt(0).toUpperCase() + item.stage.slice(1).replace('_', ' '),
                      count: item.count
                    })) || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="stage" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#00C49F" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Agent Performance (Admin Only) */}
            {user?.role === "admin" && agentMetrics && (
              <Card>
                <CardHeader>
                  <CardTitle>Agent Performance</CardTitle>
                  <CardDescription>Comparison of agent metrics</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={agentMetrics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="agentName" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalLeads" fill="#8884d8" name="Total Leads" />
                      <Bar dataKey="totalDials" fill="#82ca9d" name="Total Dials" />
                      <Bar dataKey="wins" fill="#ffc658" name="Wins" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Data Quality */}
            <Card>
              <CardHeader>
                <CardTitle>Data Quality</CardTitle>
                <CardDescription>Quality metrics for lead data</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Bad Data %</span>
                    <span className="text-sm font-bold">{(metrics?.badDataPercent || 0).toFixed(1)}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
