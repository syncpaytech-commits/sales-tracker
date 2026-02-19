import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useTaskNotifications } from "@/hooks/useTaskNotifications";
import Dashboard from "@/pages/Dashboard";
import Leads from "@/pages/Leads";
import LeadDetail from "@/pages/LeadDetail";
import Pipeline from "@/pages/Pipeline";
import Analytics from "@/pages/Analytics";
import EmailTemplates from "@/pages/EmailTemplates";
import Todos from "@/pages/Todos";
import Team from "@/pages/Team";

import TotalLeads from "@/pages/TotalLeads";
import Opportunities from "@/pages/Opportunities";
import OpportunityDetail from "@/pages/OpportunityDetail";
import Reports from "@/pages/Reports";
import Deleted from "@/pages/Deleted";

function Router() {
  // Enable task notifications
  useTaskNotifications();
  
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/leads" component={Leads} />
      <Route path="/leads/:id" component={LeadDetail} />
      <Route path="/pipeline" component={Pipeline} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/email-templates" component={EmailTemplates} />
      <Route path="/todos" component={Todos} />
      <Route path="/team" component={Team} />

      <Route path="/total-leads" component={TotalLeads} />
      <Route path="/opportunities" component={Opportunities} />
      <Route path="/opportunities/:id" component={OpportunityDetail} />
      <Route path="/reports" component={Reports} />
      <Route path="/deleted" component={Deleted} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
