"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CURRENCIES } from "@/lib/currency";

const MIN_TRAVEL_HOURS = 1;
const MAX_TRAVEL_HOURS = 100;

export default function CreatePage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    maxBudget: 2000,
    maxTravelHours: 15,
    currency: "USD",
    origin: "",
    creatorName: "",
    creatorEmail: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (form.maxTravelHours < MIN_TRAVEL_HOURS || form.maxTravelHours > MAX_TRAVEL_HOURS) {
      setError(`Max travel hours must be between ${MIN_TRAVEL_HOURS} and ${MAX_TRAVEL_HOURS}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const groupRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          startDate: form.startDate,
          endDate: form.endDate,
          maxBudget: form.maxBudget,
          maxTravelHours: form.maxTravelHours,
          currency: form.currency,
          origin: form.origin,
        }),
      });
      if (!groupRes.ok) {
        const body = await groupRes.json();
        throw new Error(body.error ?? "Failed to create group");
      }
      const { groupId } = await groupRes.json();

      const joinRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${groupId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.creatorName, email: form.creatorEmail, isOwner: true }),
      });
      if (!joinRes.ok) throw new Error("Failed to join group");

      localStorage.setItem("identity", JSON.stringify({ name: form.creatorName, email: form.creatorEmail }));
      router.push(`/groups/${groupId}`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-8 flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Create your Group</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <input className="border rounded px-3 py-2" placeholder="Group name" value={form.name} onChange={(e) => update("name", e.target.value)} required />

        <label className="text-sm font-medium -mb-2">Start date</label>
        <input type="date" className="border rounded px-3 py-2" value={form.startDate} onChange={(e) => update("startDate", e.target.value)} required />

        <label className="text-sm font-medium -mb-2">End date</label>
        <input type="date" className="border rounded px-3 py-2" value={form.endDate} onChange={(e) => update("endDate", e.target.value)} required />

        <label className="text-sm font-medium -mb-2">Traveling from</label>
        <input className="border rounded px-3 py-2" placeholder="e.g. Mumbai, India" value={form.origin} onChange={(e) => update("origin", e.target.value)} required />

        <label className="text-sm font-medium -mb-2">Currency</label>
        <select className="border rounded px-3 py-2" value={form.currency} onChange={(e) => update("currency", e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} ({c.symbol})
            </option>
          ))}
        </select>

        <label className="text-sm font-medium -mb-2">Max budget per person</label>
        <input type="number" className="border rounded px-3 py-2" value={form.maxBudget} onChange={(e) => update("maxBudget", Number(e.target.value))} required />

        <label className="text-sm font-medium -mb-2">Max travel hours ({MIN_TRAVEL_HOURS}–{MAX_TRAVEL_HOURS})</label>
        <input
          type="number"
          min={MIN_TRAVEL_HOURS}
          max={MAX_TRAVEL_HOURS}
          className="border rounded px-3 py-2"
          value={form.maxTravelHours}
          onChange={(e) => update("maxTravelHours", Number(e.target.value))}
          required
        />

        <hr />
        <p className="text-sm text-gray-500">You&apos;ll join as the first member:</p>
        <input className="border rounded px-3 py-2" placeholder="Your name" value={form.creatorName} onChange={(e) => update("creatorName", e.target.value)} required />
        <input type="email" className="border rounded px-3 py-2" placeholder="Your email" value={form.creatorEmail} onChange={(e) => update("creatorEmail", e.target.value)} required />

        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="bg-black text-white rounded px-4 py-2 disabled:opacity-50">
          {loading ? "Creating..." : "Create Group"}
        </button>
      </form>
    </main>
  );
}