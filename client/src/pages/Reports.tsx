import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Calendar, Download, FileText, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function Reports() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState<string>("today");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");

  // Get all users for agent selector (admin only)
  const { data: allUsers } = trpc.users.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  // Calculate date range based on selection
  const getDateRange = () => {
    const now = new Date();
    let start: string | undefined;
    let end: string | undefined;

    switch (dateRange) {
      case "today":
        start = new Date(now.setHours(0, 0, 0, 0)).toISOString();
        end = new Date(now.setHours(23, 59, 59, 999)).toISOString();
        break;
      case "week":
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        start = weekStart.toISOString();
        end = new Date().toISOString();
        break;
      case "custom":
        start = customStartDate ? new Date(customStartDate).toISOString() : undefined;
        end = customEndDate ? new Date(customEndDate).toISOString() : undefined;
        break;
      case "alltime":
      default:
        start = undefined;
        end = undefined;
    }

    return { start, end };
  };

  const { start, end } = getDateRange();
  
  // Determine agentId to pass (undefined for "all", specific ID for selected agent)
  const agentId = selectedAgent === "all" ? undefined : parseInt(selectedAgent);
  
  const { data: dailyReport, isLoading: dailyLoading } = trpc.reports.dailyActivity.useQuery({
    startDate: start,
    endDate: end,
    agentId,
  });

  const { data: weeklyReport, isLoading: weeklyLoading } = trpc.reports.weeklyActivity.useQuery({
    startDate: start,
    endDate: end,
    agentId,
  });

  const { data: lossReasons, isLoading: lossReasonsLoading } = trpc.reports.lossReasonBreakdown.useQuery({
    startDate: start,
    endDate: end,
    agentId,
  });

  const downloadExcel = (type: "daily" | "weekly") => {
    const data = type === "daily" ? dailyReport : weeklyReport;
    if (!data || data.length === 0) {
      toast.error("No data to download");
      return;
    }

    // Build Excel data
    const headers = type === "daily" 
      ? ["Date", "Total Calls", "DM Reached", "Callbacks Scheduled", "Opportunities Created", "Opportunities Won", "Won Value ($)", "Opportunities Lost", "Lost Value ($)", "Loss Reasons"]
      : ["Week Starting", "Total Calls", "DM Reached", "Callbacks Scheduled", "Opportunities Created", "Opportunities Won", "Won Value ($)", "Opportunities Lost", "Lost Value ($)", "Loss Reasons"];
    
    const rows = data.map((row: any) => ({
      [headers[0]]: type === "daily" ? row.date : row.weekStart,
      [headers[1]]: row.totalCalls || 0,
      [headers[2]]: row.dmReached || 0,
      [headers[3]]: row.callbacks || 0,
      [headers[4]]: row.opportunitiesCreated || 0,
      [headers[5]]: row.opportunitiesWon || 0,
      [headers[6]]: row.wonValue || 0,
      [headers[7]]: row.opportunitiesLost || 0,
      [headers[8]]: row.lostValue || 0,
      [headers[9]]: row.lostReasons && row.lostReasons.length > 0 ? row.lostReasons.join("; ") : "-",
    }));

    // Create workbook and worksheet
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, type === "daily" ? "Daily Report" : "Weekly Report");
    
    // Download
    XLSX.writeFile(wb, `${type}-report-${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success(`${type === "daily" ? "Daily" : "Weekly"} report downloaded`);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Reports</h1>
            <p className="text-muted-foreground mt-1">
              Comprehensive activity reports with business details
            </p>
          </div>
        </div>

        {/* Date Range Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Date Range
            </CardTitle>
            <CardDescription>Select the time period for your reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Time Period</Label>
                <Select value={dateRange} onValueChange={setDateRange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">This Week</SelectItem>
                    <SelectItem value="custom">Custom Range</SelectItem>
                    <SelectItem value="alltime">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {user?.role === "admin" && (
                <div className="space-y-2">
                  <Label>Agent</Label>
                  <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Agents</SelectItem>
                      {allUsers?.map((agent) => (
                        <SelectItem key={agent.id} value={agent.id.toString()}>
                          {agent.name || agent.email || "Unknown"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {dateRange === "custom" && (
                <>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Daily Activity Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Daily Activity Report
                </CardTitle>
                <CardDescription>Day-by-day breakdown of calls and contacts</CardDescription>
              </div>
                <Button onClick={() => downloadExcel("daily")} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                  Download Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {dailyLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : !dailyReport || dailyReport.length === 0 ? (
              <p className="text-muted-foreground">No activity data for selected period</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Calls</TableHead>
                      <TableHead className="text-right">DM Reached</TableHead>
                      <TableHead className="text-right">Callbacks</TableHead>
                      <TableHead className="text-right">Opps Created</TableHead>
                      <TableHead className="text-right">Opps Won</TableHead>
                      <TableHead className="text-right">Won Value</TableHead>
                      <TableHead className="text-right">Opps Lost</TableHead>
                      <TableHead className="text-right">Lost Value</TableHead>
                      <TableHead>Lost Reasons</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyReport.map((day: any) => (
                      <TableRow key={day.date}>
                        <TableCell className="font-medium">{new Date(day.date).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">{day.totalCalls || 0}</TableCell>
                        <TableCell className="text-right">{day.dmReached || 0}</TableCell>
                        <TableCell className="text-right">{day.callbacks || 0}</TableCell>
                        <TableCell className="text-right">{day.opportunitiesCreated || 0}</TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">{day.opportunitiesWon || 0}</TableCell>
                        <TableCell className="text-right text-green-600">${(day.wonValue || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">{day.opportunitiesLost || 0}</TableCell>
                        <TableCell className="text-right text-red-600">${(day.lostValue || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                          {day.lostReasons && day.lostReasons.length > 0 ? day.lostReasons.join(", ") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Activity Report */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Weekly Activity Report
                </CardTitle>
                <CardDescription>Week-by-week summary of calls and contacts</CardDescription>
              </div>
                <Button onClick={() => downloadExcel("weekly")} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {weeklyLoading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : !weeklyReport || weeklyReport.length === 0 ? (
              <p className="text-muted-foreground">No activity data for selected period</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Week Starting</TableHead>
                      <TableHead className="text-right">Calls</TableHead>
                      <TableHead className="text-right">DM Reached</TableHead>
                      <TableHead className="text-right">Callbacks</TableHead>
                      <TableHead className="text-right">Opps Created</TableHead>
                      <TableHead className="text-right">Opps Won</TableHead>
                      <TableHead className="text-right">Won Value</TableHead>
                      <TableHead className="text-right">Opps Lost</TableHead>
                      <TableHead className="text-right">Lost Value</TableHead>
                      <TableHead>Lost Reasons</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {weeklyReport.map((week: any) => (
                      <TableRow key={week.weekStart}>
                        <TableCell className="font-medium">{new Date(week.weekStart).toLocaleDateString()}</TableCell>
                        <TableCell className="text-right">{week.totalCalls || 0}</TableCell>
                        <TableCell className="text-right">{week.dmReached || 0}</TableCell>
                        <TableCell className="text-right">{week.callbacks || 0}</TableCell>
                        <TableCell className="text-right">{week.opportunitiesCreated || 0}</TableCell>
                        <TableCell className="text-right text-green-600 font-semibold">{week.opportunitiesWon || 0}</TableCell>
                        <TableCell className="text-right text-green-600">${(week.wonValue || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right text-red-600 font-semibold">{week.opportunitiesLost || 0}</TableCell>
                        <TableCell className="text-right text-red-600">${(week.lostValue || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                          {week.lostReasons && week.lostReasons.length > 0 ? week.lostReasons.join(", ") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loss Reason Breakdown Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Closed Lost Reasons
            </CardTitle>
            <CardDescription>Distribution of reasons for lost opportunities</CardDescription>
          </CardHeader>
          <CardContent>
            {lossReasonsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : !lossReasons || lossReasons.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No closed lost opportunities in this period</div>
            ) : (
              <div className="space-y-6">
                {/* Simple Pie Chart using SVG */}
                <div className="flex justify-center">
                  <svg width="300" height="300" viewBox="0 0 300 300">
                    {(() => {
                      const total = lossReasons.reduce((sum: number, item: any) => sum + item.count, 0);
                      let currentAngle = 0;
                      const colors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9'];
                      
                      return lossReasons.map((item: any, index: number) => {
                        const percentage = (item.count / total) * 100;
                        const angle = (item.count / total) * 360;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + angle;
                        currentAngle = endAngle;
                        
                        // Calculate path for pie slice
                        const startRad = (startAngle - 90) * Math.PI / 180;
                        const endRad = (endAngle - 90) * Math.PI / 180;
                        const x1 = 150 + 120 * Math.cos(startRad);
                        const y1 = 150 + 120 * Math.sin(startRad);
                        const x2 = 150 + 120 * Math.cos(endRad);
                        const y2 = 150 + 120 * Math.sin(endRad);
                        const largeArc = angle > 180 ? 1 : 0;
                        
                        return (
                          <path
                            key={item.reason}
                            d={`M 150 150 L ${x1} ${y1} A 120 120 0 ${largeArc} 1 ${x2} ${y2} Z`}
                            fill={colors[index % colors.length]}
                            stroke="white"
                            strokeWidth="2"
                          />
                        );
                      });
                    })()}
                  </svg>
                </div>
                
                {/* Legend */}
                <div className="grid grid-cols-2 gap-4">
                  {(() => {
                    const total = lossReasons.reduce((sum: number, item: any) => sum + item.count, 0);
                    const colors = ['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9'];
                    
                    return lossReasons.map((item: any, index: number) => {
                      const percentage = ((item.count / total) * 100).toFixed(1);
                      return (
                        <div key={item.reason} className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-sm"
                            style={{ backgroundColor: colors[index % colors.length] }}
                          />
                          <span className="text-sm">
                            {item.reason}: <span className="font-semibold">{item.count}</span> ({percentage}%)
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
