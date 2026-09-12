"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const [groupId, setGroupId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId || !name || !email) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${groupId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) throw new Error("Failed to join group");
      const { userId, preferences } = await res.json();

      localStorage.setItem("userId", userId);
      localStorage.setItem("name", name);
      localStorage.setItem("preferences", JSON.stringify(preferences));
      router.push(`/groups/${groupId}`);
    } catch (err) {
      console.error(err);
      setError("Couldn't join that group. Check the Group ID and try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Join a Trip Group</h1>
      <form onSubmit={handleJoin} className="flex flex-col gap-3 w-full max-w-sm">
        <input className="border rounded px-3 py-2" placeholder="Group ID" value={groupId} onChange={(e) => setGroupId(e.target.value)} />
        <input className="border rounded px-3 py-2" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="email" className="border rounded px-3 py-2" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="bg-black text-white rounded px-4 py-2 disabled:opacity-50">
          {loading ? "Joining..." : "Join Group"}
        </button>
      </form>
    </main>
  );
}