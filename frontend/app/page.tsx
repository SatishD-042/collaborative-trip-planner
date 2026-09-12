"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface GroupSummary {
  groupId: string;
  groupName: string;
  isOwner: boolean;
}

export default function HomePage() {
  const [identity, setIdentity] = useState<{ name: string; email: string } | null>(null);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("identity");
    if (stored) {
      const parsed = JSON.parse(stored);
      setIdentity(parsed);
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${encodeURIComponent(parsed.email)}/groups`)
        .then((res) => res.json())
        .then((data) => setGroups(data.groups))
        .catch((err) => console.error("Failed to fetch groups:", err))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  function switchAccount() {
    localStorage.removeItem("identity");
    setIdentity(null);
    setGroups([]);
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-4xl font-bold">Collaborative Trip Planner</h1>
      <p className="text-gray-500 max-w-md">
        Set a budget, share preferences, and plan your trip together with friends.
      </p>

      {!loading && identity && (
        <div className="w-full max-w-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Signed in as {identity.name}</p>
            <button onClick={switchAccount} className="text-xs text-gray-400 underline">
              Not you? Switch account
            </button>
          </div>

          {groups.length > 0 && (
            <div className="flex flex-col gap-2">
              {groups.map((g) => (
                <button
                  key={g.groupId}
                  onClick={() => router.push(`/groups/${g.groupId}`)}
                  className="border rounded px-4 py-3 flex items-center justify-between text-left"
                >
                  <span>{g.groupName}</span>
                  <span className="text-xs text-gray-400">{g.isOwner ? "Owner" : "Member"}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4">
        <Link href="/create" className="bg-black text-white rounded px-5 py-2">
          Create Group
        </Link>
        <Link href="/join" className="border rounded px-5 py-2">
          Join Group
        </Link>
      </div>
    </main>
  );
}