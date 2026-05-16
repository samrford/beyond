"use client";

import { useMemo, useState } from "react";
import { Link as LinkIcon, Unlink } from "lucide-react";
import { useGooglePhotosFlow } from "google-photos-picker-client/react";
import type { FlowConfig, FlowPhase } from "google-photos-picker-client";
import { apiFetch } from "@/lib/api";

const Phase = {
  idle: "idle",
  connecting: "connecting",
  creating: "creating",
  picking: "picking",
  importing: "importing",
  done: "done",
  error: "error",
} as const satisfies Record<FlowPhase, FlowPhase>;

interface GooglePhotosPickerProps {
  onSelect: (savedIds: string[]) => void;
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
  // Stable config — the hook reads it once (creates the flow on first render).
  const config = useMemo<FlowConfig>(
    () => ({
      postMessageType: "beyond:google-oauth",
      fetchJson: apiFetch,
      endpoints: {
        status: "/v1/integrations/google/status",
        connect: "/v1/integrations/google/connect",
        disconnect: "/v1/integrations/google",
        createSession: "/v1/google-photos/sessions",
        pollSession: (sid) =>
          `/v1/google-photos/sessions/${encodeURIComponent(sid)}`,
        startImport: (sid) =>
          `/v1/google-photos/sessions/${encodeURIComponent(sid)}/import`,
        getImport: (jobId) =>
          `/v1/google-photos/imports/${encodeURIComponent(jobId)}`,
      },
    }),
    []
  );

  const { state, connect, start, disconnect } = useGooglePhotosFlow(config);
  const [disconnecting, setDisconnecting] = useState(false);

  const connected = state.connected === true;
  const busy =
    state.connected === null ||
    state.phase === Phase.connecting ||
    state.phase === Phase.creating ||
    state.phase === Phase.picking ||
    state.phase === Phase.importing;
  const connectedIdle = connected && state.phase === Phase.idle;

  // Two-gesture: first click connects (popup opens synchronously
  // inside connect()); once connected the user clicks again to pick. start()
  // resolves exactly once with the saved IDs
  const handleClick = async () => {
    try {
      if (!connected) {
        await connect();
        return;
      }
      const result = await start();
      onSelect(
        maxItems ? result.savedIds.slice(0, maxItems) : result.savedIds
      );
    } catch {
      // Failure is reflected in state.error (rendered below).
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await disconnect();
    } catch {
      // state.error reflects it.
    } finally {
      setDisconnecting(false);
    }
  };

  const label = (() => {
    if (!connected) return "Connect Google Photos account";
    if (state.phase === Phase.importing && state.progress) {
      return `Importing ${state.progress.completed}/${state.progress.total || "…"}`;
    }
    if (
      state.phase === Phase.creating ||
      state.phase === Phase.picking ||
      state.phase === Phase.importing
    ) {
      return "Starting import…";
    }
    if (state.phase === Phase.done) return "Imported!";
    return "From Google Photos";
  })();

  const hint = (() => {
    if (!connectedIdle) return null;
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
        {connectedIdle && (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            title="Disconnect Google Photos"
            className="absolute top-2 right-2 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
          >
            <Unlink size={13} />
          </button>
        )}
        {state.error && (
          <p className="mt-1 text-xs text-red-600 dark:text-red-400">
            {state.error}
          </p>
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
        {connectedIdle && (
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
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
      {state.error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">
          {state.error}
        </p>
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
