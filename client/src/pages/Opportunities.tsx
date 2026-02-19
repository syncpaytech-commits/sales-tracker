import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { OPPORTUNITY_STAGE_LABELS } from "@shared/opportunityStages";
import { DollarSign, Search, TrendingUp } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

export default function Opportunities() {
  const { user } = useAuth();
  const { data: opportunities, isLoading } = trpc.opportunities.list.useQuery();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");

  const filteredOpportunities = opportunities?.filter((opp) => {
    const matchesSearch = 
      opp.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (opp.email && opp.email.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStage = stageFilter === "all" || opp.stage === stageFilter;
    
    return matchesSearch && matchesStage;
  });

  // Calculate total deal value
  const totalValue = filteredOpportunities?.reduce((sum, opp) => {
    const value = parseFloat(opp.dealValue || "0");
    return sum + (isNaN(value) ? 0 : value);
  }, 0) || 0;

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Opportunities</h1>
            <p className="text-muted-foreground mt-2">Track qualified leads and manage your sales pipeline</p>
          </div>
          <div className="flex items-center gap-4">
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Total Pipeline Value</p>
                  <p className="text-lg font-bold">${totalValue.toLocaleString()}</p>
                </div>
              </div>
            </Card>
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Active Opportunities</p>
                  <p className="text-lg font-bold">{filteredOpportunities?.length || 0}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filter Opportunities</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by company, contact, deal name, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <p className="text-xs text-muted-foreground mt-1">
                  Found {filteredOpportunities?.length || 0} opportunit{filteredOpportunities?.length !== 1 ? 'ies' : 'y'}
                </p>
              )}
            </div>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {Object.entries(OPPORTUNITY_STAGE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Deal Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Stage</TableHead>
                <TableHead>Deal Value</TableHead>
                <TableHead>Probability</TableHead>
                <TableHead>Expected Close</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">Loading...</TableCell>
                </TableRow>
              ) : filteredOpportunities && filteredOpportunities.length > 0 ? (
                filteredOpportunities.map((opp) => (
                  <TableRow key={opp.id}>
                    <TableCell className="font-medium">{opp.name}</TableCell>
                    <TableCell>{opp.companyName}</TableCell>
                    <TableCell>{opp.contactName}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        opp.stage === "closed_won" ? "bg-green-100 text-green-700" :
                        opp.stage === "closed_lost" ? "bg-red-100 text-red-700" :
                        opp.stage === "negotiation" ? "bg-orange-100 text-orange-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {OPPORTUNITY_STAGE_LABELS[opp.stage]}
                      </span>
                    </TableCell>
                    <TableCell>{opp.dealValue ? `$${parseFloat(opp.dealValue).toLocaleString()}` : "—"}</TableCell>
                    <TableCell>{opp.probability}%</TableCell>
                    <TableCell>
                      {opp.expectedCloseDate 
                        ? new Date(opp.expectedCloseDate).toLocaleDateString()
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Link href={`/opportunities/${opp.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No opportunities found. Convert interested leads to opportunities to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
