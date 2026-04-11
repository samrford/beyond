import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";

// ─── Types ───────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  summary: string;
  coverPhoto: string;
  createdAt: string;
  updatedAt: string;
  days: PlanDay[];
  unassigned: PlanItem[];
}

export interface PlanDay {
  id: string;
  planId: string;
  date: string;
  notes: string;
  items: PlanItem[];
}

export interface PlanItem {
  id: string;
  planId: string;
  planDayId: string | null;
  name: string;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
  orderIndex: number;
  estimatedTime: string;
  startTime: string | null;
  duration: number;
}

// ─── Query Keys ──────────────────────────────────────────

export const planKeys = {
  all: ["plans"] as const,
  detail: (id: string) => ["plan", id] as const,
};

// ─── Queries ─────────────────────────────────────────────

export function usePlans() {
  return useQuery({
    queryKey: planKeys.all,
    queryFn: () => apiFetch<Plan[]>("/api/plans"),
  });
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: planKeys.detail(id),
    queryFn: () => apiFetch<Plan>(`/api/plans/${id}`),
    enabled: !!id,
  });
}

// ─── Mutations ───────────────────────────────────────────

export function useCreatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Plan>) =>
      apiFetch<Plan>("/api/plans", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

export function useUpdatePlan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Plan>) =>
      apiFetch<Plan>(`/api/plans/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

export function useDeletePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}

export function useCreatePlanDay(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string }) =>
      apiFetch<PlanDay>(`/api/plans/${planId}/days`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) });
    },
  });
}

export function useCreatePlanItem(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PlanItem>) =>
      apiFetch<PlanItem>(`/api/plans/${planId}/items`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) });
    },
  });
}

export function useUpdatePlanItem(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PlanItem) =>
      apiFetch<PlanItem>(`/api/plans/items/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) });
    },
  });
}

export function useDeletePlanItem(planId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) =>
      apiFetch<void>(`/api/plans/items/${itemId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.detail(planId) });
    },
  });
}

export function useConvertPlanToTrip(planId: string) {
  return useMutation({
    mutationFn: () =>
      apiFetch<{ tripId: string }>(`/api/plans/${planId}/convert`, {
        method: "POST",
      }),
  });
}

export function useImportPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch<Plan>("/api/plans/import", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: planKeys.all });
    },
  });
}
