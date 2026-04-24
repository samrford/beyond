"use client";

import {
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider as TanstackProvider,
} from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { ApiError } from "@/lib/api";

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 404) return "Not found.";
    if (error.status === 401 || error.status === 403)
      return "You're not authorised to do that.";
    if (error.status >= 500)
      return "The server had a problem. Please try again.";
    return `Request failed (${error.status}).`;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong.";
}

export default function QueryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
        queryCache: new QueryCache({
          onError: (error, query) => {
            if (query.state.data !== undefined) return;
            toast.error(describeError(error), { id: `query-${String(query.queryKey)}` });
          },
        }),
        mutationCache: new MutationCache({
          onError: (error, _vars, _ctx, mutation) => {
            if (mutation.options.onError) return;
            toast.error(describeError(error));
          },
        }),
      })
  );

  return (
    <TanstackProvider client={queryClient}>{children}</TanstackProvider>
  );
}
