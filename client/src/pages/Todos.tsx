import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { CheckCircle2, Circle, Plus, Trash2, Download, ExternalLink, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Todos() {
  const [, setLocation] = useLocation();
  const { data: todos, isLoading, refetch } = trpc.todos.list.useQuery();
  const createTodo = trpc.todos.create.useMutation();
  const updateTodo = trpc.todos.update.useMutation();
  const deleteTodo = trpc.todos.delete.useMutation();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTodo, setNewTodo] = useState({
    title: "",
    description: "",
    dueDate: "",
    dueTime: "",
    priority: "medium" as "low" | "medium" | "high",
  });

  const handleCreateTodo = async () => {
    if (!newTodo.title) {
      toast.error("Please enter a task title");
      return;
    }

    try {
      const dueDate = newTodo.dueDate && newTodo.dueTime
        ? new Date(`${newTodo.dueDate}T${newTodo.dueTime}`)
        : newTodo.dueDate
        ? new Date(newTodo.dueDate)
        : undefined;

      await createTodo.mutateAsync({
        title: newTodo.title,
        description: newTodo.description || undefined,
        dueDate,
        priority: newTodo.priority,
      });
      toast.success("Task created!");
      setIsAddDialogOpen(false);
      setNewTodo({ title: "", description: "", dueDate: "", dueTime: "", priority: "medium" });
      refetch();
    } catch (error) {
      toast.error("Failed to create task");
    }
  };

  const handleToggleComplete = async (id: number, completed: number) => {
    try {
      await updateTodo.mutateAsync({
        id,
        completed: completed ? 0 : 1,
      });
      refetch();
    } catch (error) {
      toast.error("Failed to update task");
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteTodo.mutateAsync({ id });
      toast.success("Task deleted");
      refetch();
    } catch (error) {
      toast.error("Failed to delete task");
    }
  };

  const handleExportDaily = () => {
    const today = new Date();
    const todayStr = format(today, "MMMM d, yyyy");
    
    // Get all tasks for today sorted by time
    const todayTasks = (todos || [])
      .filter(t => {
        if (!t.dueDate) return false;
        const due = new Date(t.dueDate);
        return due.toDateString() === today.toDateString();
      })
      .sort((a, b) => {
        if (!a.dueDate || !b.dueDate) return 0;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      });

    // Create printable HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daily Task List - ${todayStr}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 40px auto;
            padding: 20px;
          }
          h1 {
            color: #333;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .task {
            margin: 20px 0;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
          }
          .task-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
          }
          .task-title {
            font-weight: bold;
            font-size: 16px;
          }
          .task-time {
            color: #666;
            font-size: 14px;
          }
          .task-description {
            color: #555;
            margin-top: 8px;
          }
          .priority-high { border-left: 4px solid #ef4444; }
          .priority-medium { border-left: 4px solid #f59e0b; }
          .priority-low { border-left: 4px solid #10b981; }
          .no-tasks {
            text-align: center;
            color: #999;
            padding: 40px;
          }
          @media print {
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <h1>Daily Task List - ${todayStr}</h1>
        ${todayTasks.length > 0 ? todayTasks.map(task => `
          <div class="task priority-${task.priority}">
            <div class="task-header">
              <span class="task-title">${task.title}</span>
              <span class="task-time">${task.dueDate ? format(new Date(task.dueDate), "h:mm a") : "No time set"}</span>
            </div>
            ${task.description ? `<div class="task-description">${task.description}</div>` : ""}
            ${task.linkedLeadId ? `<div class="task-description"><em>Related to Lead #${task.linkedLeadId}</em></div>` : ""}
          </div>
        `).join("") : '<div class="no-tasks">No tasks scheduled for today</div>'}
      </body>
      </html>
    `;

    // Open in new window for printing
    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    }
  };

  const pendingTodos = todos?.filter(t => !t.completed) || [];
  const completedTodos = todos?.filter(t => t.completed) || [];
  const overdueTodos = pendingTodos.filter(t => t.dueDate && new Date(t.dueDate) < new Date());
  const todayTodos = pendingTodos.filter(t => {
    if (!t.dueDate) return false;
    const today = new Date();
    const due = new Date(t.dueDate);
    return due.toDateString() === today.toDateString();
  }).sort((a, b) => {
    if (!a.dueDate || !b.dueDate) return 0;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const priorityColors = {
    high: "text-red-600 dark:text-red-400",
    medium: "text-yellow-600 dark:text-yellow-400",
    low: "text-green-600 dark:text-green-400",
  };

  const TaskCard = ({ todo, showTime = false }: { todo: any; showTime?: boolean }) => (
    <div 
      className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
      onClick={(e) => {
        // If clicking the checkbox or delete button, don't navigate
        if ((e.target as HTMLElement).closest('button')) return;
        if (todo.linkedLeadId) {
          setLocation(`/leads/${todo.linkedLeadId}`);
        }
      }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggleComplete(todo.id, todo.completed);
        }}
        className="mt-0.5"
      >
        <Circle className="h-5 w-5 text-muted-foreground" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium">{todo.title}</p>
          {todo.linkedLeadId && (
            <ExternalLink className="h-3 w-3 text-muted-foreground" />
          )}
        </div>
        {todo.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {todo.description}
          </p>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs font-medium ${priorityColors[todo.priority as keyof typeof priorityColors]}`}>
            {todo.priority.toUpperCase()}
          </span>
          {todo.dueDate && (
            <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-950 px-2 py-1 rounded">
              <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                {showTime ? (
                  // Today's tasks: show time only
                  format(new Date(todo.dueDate), "h:mm a")
                ) : (
                  // Other tasks: show date and time
                  `${format(new Date(todo.dueDate), "MMM d")} at ${format(new Date(todo.dueDate), "h:mm a")}`
                )}
              </span>
            </div>
          )}
          {todo.linkedLeadId && (
            <span className="text-xs text-blue-600">
              Lead #{todo.linkedLeadId}
            </span>
          )}
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          handleDelete(todo.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <DashboardLayout>
      <div className="p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">My Tasks</h1>
            <p className="text-muted-foreground mt-2">Manage your daily tasks and callbacks</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportDaily}>
              <Download className="mr-2 h-4 w-4" />
              Export Today
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Task
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Task</DialogTitle>
                  <DialogDescription>Add a new task to your todo list</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Task Title</Label>
                    <Input
                      id="title"
                      value={newTodo.title}
                      onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
                      placeholder="Follow up with Acme Corp"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={newTodo.description}
                      onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
                      placeholder="Additional details..."
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={newTodo.dueDate}
                      onChange={(e) => setNewTodo({ ...newTodo, dueDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueTime">Due Time</Label>
                    <div className="flex gap-2 mb-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewTodo({ ...newTodo, dueTime: "09:00" })}
                      >
                        9 AM
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewTodo({ ...newTodo, dueTime: "11:00" })}
                      >
                        11 AM
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewTodo({ ...newTodo, dueTime: "14:00" })}
                      >
                        2 PM
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewTodo({ ...newTodo, dueTime: "16:00" })}
                      >
                        4 PM
                      </Button>
                    </div>
                    <Input
                      id="dueTime"
                      type="time"
                      value={newTodo.dueTime}
                      onChange={(e) => setNewTodo({ ...newTodo, dueTime: e.target.value })}
                      placeholder="Or enter custom time"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={newTodo.priority}
                      onValueChange={(value: "low" | "medium" | "high") =>
                        setNewTodo({ ...newTodo, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTodo}>Create Task</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">Loading tasks...</div>
        ) : (
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {/* Overdue Tasks */}
            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Overdue ({overdueTodos.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {overdueTodos.length > 0 ? (
                  overdueTodos.map((todo) => <TaskCard key={todo.id} todo={todo} />)
                ) : (
                  <p className="text-center text-muted-foreground py-8">No overdue tasks</p>
                )}
              </CardContent>
            </Card>

            {/* Today's Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>Due Today ({todayTodos.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {todayTodos.length > 0 ? (
                  todayTodos.map((todo) => <TaskCard key={todo.id} todo={todo} showTime={true} />)
                ) : (
                  <p className="text-center text-muted-foreground py-8">No tasks due today</p>
                )}
              </CardContent>
            </Card>

            {/* All Pending Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>All Pending ({pendingTodos.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingTodos.length > 0 ? (
                  pendingTodos.map((todo) => <TaskCard key={todo.id} todo={todo} />)
                ) : (
                  <p className="text-center text-muted-foreground py-8">No pending tasks</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTodos.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Completed ({completedTodos.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {completedTodos.map((todo) => (
                <div key={todo.id} className="flex items-start gap-3 p-3 rounded-lg border opacity-60">
                  <button
                    onClick={() => handleToggleComplete(todo.id, todo.completed)}
                    className="mt-0.5"
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium line-through">{todo.title}</p>
                    {todo.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {todo.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(todo.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
