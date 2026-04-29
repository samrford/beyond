"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import UserPicker from "./UserPicker";

/**
 * UserSearch is a thin wrapper around UserPicker that navigates to the
 * selected user's profile. Used by the sidebar.
 */
export default function UserSearch({ collapsed = false }: { collapsed?: boolean }) {
  const router = useRouter();

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
    <div className="px-1">
      <UserPicker
        placeholder="Find people"
        onSelect={(hit) => router.push(`/u/${hit.handle}`)}
      />
    </div>
  );
}
