"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const [groupId, setGroupId] = useState("");
  const [userId, setUserId] = useState("");
  const router = useRouter();

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId || !userId) return;

    localStorage.setItem("userId", userId);
    router.push(`/groups/${groupId}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Join a Trip Group</h1>
      <form onSubmit={handleJoin} className="flex flex-col gap-3 w-full max-w-sm">
        <input
          className="border rounded px-3 py-2"
          placeholder="Group ID"
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Your User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <button type="submit" className="bg-black text-white rounded px-4 py-2">
          Join Group
        </button>
      </form>
    </main>
  );
}