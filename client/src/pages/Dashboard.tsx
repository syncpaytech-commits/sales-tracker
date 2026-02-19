import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart3, Phone, Target, TrendingUp, Users, Calendar } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState, useMemo } from "react";

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [selectedAgentId, setSelectedAgentId] = useState<number | undefined>(undefined);
  const [dateRange, setDateRange] = useState<string>("all");
  
  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const now = new Date();
    let start: Date | undefined;
    let end: Date | undefined = now;
    
    switch (dateRange) {
      case "7days":
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "30days":
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        start = undefined;
        end = undefined;
    }
    return { startDate: start, endDate: end };
  }, [dateRange]);
  
  const { data: metrics, isLoading: metricsLoading } = trpc.analytics.metrics.useQuery({
    startDate,
    endDate,
    filterByAgentId: selectedAgentId
  });
  const { data: allUsers } = trpc.users.list.useQuery(undefined, { enabled: user?.role === "admin" });
  const { data: followUpsToday } = trpc.leads.followUpsDueToday.useQuery();
  const { data: overdueFollowUps } = trpc.leads.overdueFollowUps.useQuery();

  if (loading || !user) {
    return <DashboardLayout><div className="p-8">Loading...</div></DashboardLayout>;
  }

  const stats = [
    {
      title: "Total Leads",
      value: metrics?.totalLeads || 0,
      icon: Users,
      description: "Active leads in pipeline",
    },
    {
      title: "Total Dials",
      value: metrics?.totalDials || 0,
      icon: Phone,
      description: "Calls made",
    },
    {
      title: "Connect Rate",
      value: `${(metrics?.connectRate || 0).toFixed(1)}%`,
      icon: Target,
      description: "DM reached per call",
    },
    {
      title: "DM Rate",
      value: `${(metrics?.dmRate || 0).toFixed(1)}%`,
      icon: Target,
      description: "Leads with DM reached",
    },
    {
      title: "Avg Calls to DM",
      value: (metrics?.avgCallsToReachDM || 0).toFixed(1),
      icon: Phone,
      description: "Average calls to reach DM",
    },
    {
      title: "Avg Calls to Win",
      value: (metrics?.avgCallsToClosedWon || 0).toFixed(1),
      icon: TrendingUp,
      description: "Average calls to close",
    },
    {
      title: "Close Rate",
      value: `${(metrics?.closeRate || 0).toFixed(1)}%`,
      icon: TrendingUp,
      description: "Opportunities won",
    },
    {
      title: "Lead → Opp Rate",
      value: `${(metrics?.leadToOpportunityRate || 0).toFixed(1)}%`,
      icon: TrendingUp,
      description: "Leads converted to opportunities",
    },
    {
      title: "End-to-End",
      value: `${(metrics?.endToEndConversion || 0).toFixed(1)}%`,
      icon: BarChart3,
      description: "Leads to closed won",
    },
  ];

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {user.name || user.email}</h1>
            <p className="text-muted-foreground mt-2">Here's what's happening with your sales pipeline today.</p>
          </div>
          
          {/* Filters (Admin Only) */}
          {user.role === "admin" && (
            <div className="flex gap-4 items-center">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Select value={selectedAgentId?.toString() || "all"} onValueChange={(v) => setSelectedAgentId(v === "all" ? undefined : parseInt(v))}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="All Agents" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agents</SelectItem>
                    {allUsers?.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id.toString()}>
                        {agent.name || agent.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="7days">Last 7 Days</SelectItem>
                    <SelectItem value="30days">Last 30 Days</SelectItem>
                    <SelectItem value="thisMonth">This Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Follow-ups Section */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Follow-ups Due Today</CardTitle>
              <CardDescription>Leads requiring attention today</CardDescription>
            </CardHeader>
            <CardContent>
              {followUpsToday && followUpsToday.length > 0 ? (
                <div className="space-y-2">
                  {followUpsToday.slice(0, 5).map((lead) => {
                    const isQuoteFollowUp = lead.quoteDate && new Date(lead.quoteDate).toDateString() === new Date(Date.now() - 86400000).toDateString();
                    return (
                      <Link key={lead.id} href={`/leads/${lead.id}`}>
                        <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer">
                          <div>
                            <p className="font-medium">{lead.companyName}</p>
                            <p className="text-sm text-muted-foreground">
                              {lead.contactName} • {isQuoteFollowUp ? '📋 Quote Follow-up' : '📞 Callback'}
                            </p>
                          </div>
                          <Button variant="ghost" size="sm">View</Button>
                        </div>
                      </Link>
                    );
                  })}
                  {followUpsToday.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      +{followUpsToday.length - 5} more
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No follow-ups due today</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Overdue Follow-ups</CardTitle>
              <CardDescription>Leads that need immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              {overdueFollowUps && overdueFollowUps.length > 0 ? (
                <div className="space-y-2">
                  {overdueFollowUps.slice(0, 5).map((lead) => (
                    <Link key={lead.id} href={`/leads/${lead.id}`}>
                      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-accent cursor-pointer">
                        <div>
                          <p className="font-medium">{lead.companyName}</p>
                          <p className="text-sm text-muted-foreground">{lead.contactName}</p>
                        </div>
                        <Button variant="ghost" size="sm">View</Button>
                      </div>
                    </Link>
                  ))}
                  {overdueFollowUps.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      +{overdueFollowUps.length - 5} more
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No overdue follow-ups</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-4">
            <Link href="/leads">
              <Button>
                <Users className="mr-2 h-4 w-4" />
                View All Leads
              </Button>
            </Link>
            <Link href="/pipeline">
              <Button variant="outline">
                <BarChart3 className="mr-2 h-4 w-4" />
                Pipeline View
              </Button>
            </Link>
            <Link href="/analytics">
              <Button variant="outline">
                <TrendingUp className="mr-2 h-4 w-4" />
                Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
