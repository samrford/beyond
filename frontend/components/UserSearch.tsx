"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X } from "lucide-react";
import { useUserSearch } from "@/lib/queries/profiles";

export default function UserSearch({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(input.trim()), 300);
    return () => clearTimeout(t);
  }, [input]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const { data, isFetching } = useUserSearch(debounced);

  const go = (handle: string) => {
    setInput("");
    setOpen(false);
    router.push(`/u/${handle}`);
  };

  if (collapsed) {
    return (
      <button
        onClick={() => router.push("/u")}
        className="w-full flex justify-center p-3 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        title="Find people"
        aria-label="Find people"
      >
        <Search size={20} />
      </button>
    );
  }

  return (
    <div ref={containerRef} className="relative px-1">
      <div className="relative">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          type="text"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Find people"
          className="w-full pl-9 pr-8 py-2 rounded-xl bg-white/70 dark:bg-gray-900/50 border border-orange-100 dark:border-orange-900/30 text-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          aria-label="Search users"
        />
        {input && (
          <button
            onClick={() => setInput("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && debounced.length >= 2 && (
        <div className="absolute left-0 right-0 mt-2 z-50 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden max-h-80 overflow-y-auto">
          {isFetching && (
            <p className="px-4 py-3 text-sm text-gray-500">Searching...</p>
          )}
          {!isFetching && (data?.length ?? 0) === 0 && (
            <p className="px-4 py-3 text-sm text-gray-500">No users found.</p>
          )}
          {!isFetching && data && data.length > 0 && (
            <ul>
              {data.map((hit) => (
                <li key={hit.userId}>
                  <button
                    onClick={() => go(hit.handle)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                  >
                    {hit.avatarUrl ? (
                      <Image
                        src={hit.avatarUrl}
                        alt={hit.displayName || hit.handle}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-rose-500 flex items-center justify-center text-white text-sm font-bold">
                        {(hit.displayName || hit.handle).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">
                        {hit.displayName || hit.handle}
                      </p>
                      <p className="text-xs text-gray-500 font-mono truncate">
                        @{hit.handle}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
