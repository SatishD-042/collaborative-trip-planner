"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function JoinPage() {
  const [groupId, setGroupId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [hasIdentity, setHasIdentity] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("identity");
    if (stored) setHasIdentity(true);
  }, []);

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!groupId) return;
    if (!hasIdentity) {
      if (!name || !email) return;
      localStorage.setItem("identity", JSON.stringify({ name, email }));
    }
    router.push(`/groups/${groupId}`);
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <h1 className="text-2xl font-bold">Join a Trip Group</h1>
      <form onSubmit={handleJoin} className="flex flex-col gap-3 w-full max-w-sm">
        <input className="border rounded px-3 py-2" placeholder="Group ID" value={groupId} onChange={(e) => setGroupId(e.target.value)} />
        {!hasIdentity && (
          <>
            <input className="border rounded px-3 py-2" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="email" className="border rounded px-3 py-2" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </>
        )}
        <button type="submit" className="bg-black text-white rounded px-4 py-2">
          Join Group
        </button>
      </form>
    </main>
  );
}