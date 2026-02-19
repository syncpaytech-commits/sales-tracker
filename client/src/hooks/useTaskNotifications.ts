import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export function useTaskNotifications() {
  const [, setLocation] = useLocation();
  const { data: todos } = trpc.todos.list.useQuery(undefined, {
    refetchInterval: 60000, // Check every minute
  });
  const notifiedTasksRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    // Request notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!todos || Notification.permission !== "granted") return;

    const now = new Date();
    const dueTasks = todos.filter((todo) => {
      if (!todo.dueDate || todo.completed) return false;
      
      const dueDate = new Date(todo.dueDate);
      const timeDiff = dueDate.getTime() - now.getTime();
      
      // Task is due if within 1 minute window and not already notified
      return (
        timeDiff <= 60000 && // Due within next minute
        timeDiff >= -60000 && // Or overdue by less than 1 minute
        !notifiedTasksRef.current.has(todo.id)
      );
    });

    dueTasks.forEach((task) => {
      const notification = new Notification("🔔 Task Due Now", {
        body: task.linkedLeadId
          ? `${task.title} - Lead #${task.linkedLeadId}`
          : task.title,
        icon: "/favicon.ico",
        tag: `task-${task.id}`,
        requireInteraction: true, // Keep notification visible until user interacts
        silent: false, // Use system notification sound
      });

      notification.onclick = () => {
        window.focus();
        if (task.linkedLeadId) {
          setLocation(`/leads/${task.linkedLeadId}`);
        } else {
          setLocation("/todos");
        }
        notification.close();
      };

      // Mark as notified
      notifiedTasksRef.current.add(task.id);
    });
  }, [todos, setLocation]);
}
