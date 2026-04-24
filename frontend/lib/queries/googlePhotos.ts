import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api";

export interface GoogleStatus {
  connected: boolean;
  scopes: string[] | null;
}

export interface ConnectResponse {
  consentUrl: string;
  state: string;
}

export interface SessionResponse {
  sessionId: string;
  pickerUri: string;
}

export interface SessionStatus {
  status: "pending" | "ready" | "expired";
}

export interface ImportJob {
  id: string;
  status: "pending" | "running" | "complete" | "failed";
  total: number;
  completed: number;
  failed: number;
  imageUrls: string[];
  error?: string;
}

export const googleKeys = {
  status: ["google", "status"] as const,
  session: (id: string) => ["google", "session", id] as const,
  import: (id: string) => ["google", "import", id] as const,
};

export function useGoogleStatus() {
  return useQuery({
    queryKey: googleKeys.status,
    queryFn: () => apiFetch<GoogleStatus>("/v1/integrations/google/status"),
  });
}

export function useGoogleConnect() {
  return useMutation({
    mutationFn: () =>
      apiFetch<ConnectResponse>("/v1/integrations/google/connect", {
        method: "POST",
      }),
  });
}

export function useGoogleDisconnect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<void>("/v1/integrations/google", { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: googleKeys.status });
    },
  });
}

export function useCreatePickerSession() {
  return useMutation({
    mutationFn: () =>
      apiFetch<SessionResponse>("/v1/google-photos/sessions", {
        method: "POST",
      }),
  });
}

export function usePickerSessionStatus(sessionId: string | null) {
  return useQuery({
    queryKey: googleKeys.session(sessionId ?? ""),
    queryFn: () =>
      apiFetch<SessionStatus>(`/v1/google-photos/sessions/${sessionId}`),
    enabled: !!sessionId,
    refetchInterval: (q) =>
      q.state.data?.status === "ready" ? false : 2000,
  });
}

export function useStartImport() {
  return useMutation({
    mutationFn: (sessionId: string) =>
      apiFetch<{ importJobId: string }>(
        `/v1/google-photos/sessions/${sessionId}/import`,
        { method: "POST" }
      ),
  });
}

export function useImportJob(jobId: string | null) {
  return useQuery({
    queryKey: googleKeys.import(jobId ?? ""),
    queryFn: () =>
      apiFetch<ImportJob>(`/v1/google-photos/imports/${jobId}`),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      return s === "complete" || s === "failed" ? false : 1500;
    },
  });
}
