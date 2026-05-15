"use client";

import { useEffect, useRef, useState } from "react";
import { Link as LinkIcon, Unlink } from "lucide-react";
import {
  useCreatePickerSession,
  useGoogleConnect,
  useGoogleDisconnect,
  useGoogleStatus,
  useImportJob,
  usePickerSessionStatus,
  useStartImport,
} from "@/lib/queries/googlePhotos";

type Phase =
  | "idle"
  | "picking"
  | "importing"
  | "done"
  | "error";

interface GooglePhotosPickerProps {
  onSelect: (imageUrls: string[]) => void;
  className?: string;
  /** "card" renders a chunky aspect-video tile (used in CheckpointForm photo grid).
   *  "button" (default) renders a compact inline button. */
  variant?: "button" | "card";
  /** Cap the number of photos passed to onSelect. If the user picks more in
   *  Google's UI we keep the first `maxItems`. No cap by default. */
  maxItems?: number;
}

export default function GooglePhotosPicker({
  onSelect,
  className = "",
  variant = "button",
  maxItems,
}: GooglePhotosPickerProps) {
  const status = useGoogleStatus();
  const connect = useGoogleConnect();
  const disconnect = useGoogleDisconnect();
  const createSession = useCreatePickerSession();
  const startImport = useStartImport();

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const pickerWindowRef = useRef<Window | null>(null);

  // Latch flags so each transition fires exactly once, regardless of parent
  // re-renders or React Query returning the same data object repeatedly.
  const importStartedRef = useRef(false);
  const importFinalizedRef = useRef(false);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  const session = usePickerSessionStatus(sessionId);
  const job = useImportJob(jobId);

  // When picker reports ready, kick off the import (once).
  useEffect(() => {
    if (session.data?.status !== "ready") return;
    if (!sessionId || importStartedRef.current) return;
    importStartedRef.current = true;
    pickerWindowRef.current?.close();
    pickerWindowRef.current = null;
    setPhase("importing");
    startImport.mutate(sessionId, {
      onSuccess: (res) => setJobId(res.importJobId),
      onError: (e) => {
        setPhase("error");
        setError(e instanceof Error ? e.message : "Failed to start import");
      },
    });
  }, [session.data?.status, sessionId, startImport]);

  // When import completes, surface results (once).
  useEffect(() => {
    const status = job.data?.status;
    if (status !== "complete" && status !== "failed") return;
    if (importFinalizedRef.current) return;
    importFinalizedRef.current = true;

    if (status === "complete") {
      setPhase("done");
      const urls = job.data!.imageUrls;
      onSelectRef.current(maxItems ? urls.slice(0, maxItems) : urls);
      setTimeout(() => {
        setSessionId(null);
        setJobId(null);
        setPhase("idle");
        importStartedRef.current = false;
        importFinalizedRef.current = false;
      }, 1500);
    } else {
      setPhase("error");
      setError(job.data?.error || "Import failed");
    }
  }, [job.data?.status, job.data, maxItems]);

  const handleClick = async () => {
    setError(null);
    if (!status.data?.connected) {
      await connectGoogle();
      // After connecting, the status query will refetch. User clicks again.
      return;
    }
    await openPicker();
  };

  const connectGoogle = async () => {
    try {
      const { consentUrl } = await connect.mutateAsync();
      const popup = window.open(
        consentUrl,
        "beyond-google-auth",
        "width=500,height=650"
      );
      if (!popup) {
        setError("Popup blocked — please allow popups for this site.");
        return;
      }
      await waitForOAuthMessage();
      await status.refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to connect");
    }
  };

  const openPicker = async () => {
    try {
      importStartedRef.current = false;
      importFinalizedRef.current = false;
      setJobId(null);
      setPhase("picking");
      const res = await createSession.mutateAsync();
      setSessionId(res.sessionId);
      const popup = window.open(
        res.pickerUri,
        "beyond-google-picker",
        "width=900,height=720"
      );
      if (!popup) {
        setError("Popup blocked — please allow popups for this site.");
        setPhase("error");
        return;
      }
      pickerWindowRef.current = popup;
    } catch (e) {
      setPhase("error");
      setError(e instanceof Error ? e.message : "Failed to open picker");
    }
  };

  const busy =
    status.isLoading ||
    connect.isPending ||
    createSession.isPending ||
    phase === "picking" ||
    phase === "importing";

  const connected = !!status.data?.connected;
  const canDisconnect =
    connected && phase !== "picking" && phase !== "importing";

  const label = (() => {
    if (!connected) return "Connect Google Photos account";
    if (phase === "importing" && job.data) {
      return `Importing ${job.data.completed}/${job.data.total || "…"}`;
    }
    if (phase === "importing") return "Starting import…";
    if (phase === "done") return "Imported!";
    return "From Google Photos";
  })();

  const hint = (() => {
    if (!connected || phase !== "idle") return null;
    if (maxItems === 1) return "Select 1 photo in Google Photos";
    if (maxItems && maxItems > 1) return `Select up to ${maxItems} photos`;
    return null;
  })();

  if (variant === "card") {
    return (
      <div className={`relative ${className}`}>
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className="aspect-video w-full flex flex-col items-center justify-center gap-2 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-200 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all disabled:opacity-50"
        >
          <GooglePhotosLogo size={22} />
          <span className="text-xs font-bold">{label}</span>
        </button>
        {canDisconnect && (
          <button
            type="button"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            title="Disconnect Google Photos"
            className="absolute top-2 right-2 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
          >
            <Unlink size={13} />
          </button>
        )}
        {error && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="inline-flex items-stretch gap-1">
        <button
          type="button"
          onClick={handleClick}
          disabled={busy}
          className="inline-flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
        >
          {connected ? <GooglePhotosLogo size={16} /> : <LinkIcon size={16} />}
          <span className="flex-1 text-left">{label}</span>
        </button>
        {canDisconnect && (
          <button
            type="button"
            onClick={() => disconnect.mutate()}
            disabled={disconnect.isPending}
            title="Disconnect Google Photos"
            className="flex items-center px-2 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-400 hover:text-red-500 hover:border-red-400 dark:hover:border-red-500 transition-all disabled:opacity-50"
          >
            <Unlink size={14} />
          </button>
        )}
      </div>
      {hint && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function GooglePhotosLogo({ size = 16 }: { size?: number }) {
  return (
    <img
      src="/google-photos-logo.svg"
      alt="Google Photos"
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}

// Resolves when the callback popup posts back to the opener.
function waitForOAuthMessage(): Promise<void> {
  return new Promise((resolve, reject) => {
    const handler = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== "object" || data.type !== "beyond:google-oauth") {
        return;
      }
      window.removeEventListener("message", handler);
      if (data.status === "success") resolve();
      else reject(new Error(data.message || "OAuth failed"));
    };
    window.addEventListener("message", handler);
    // Safety timeout — 5 minutes.
    setTimeout(() => {
      window.removeEventListener("message", handler);
      reject(new Error("OAuth timed out"));
    }, 5 * 60 * 1000);
  });
}
