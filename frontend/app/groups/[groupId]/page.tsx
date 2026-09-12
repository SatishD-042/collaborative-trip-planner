"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Slider } from "@/components/ui/slider";

const TAG_POOL = [
  "Beach",
  "Nightlife",
  "Nature",
  "Adventure",
  "Culture",
  "Food",
  "Relaxation",
  "Shopping",
  "Family-Friendly",
  "Budget",
];

interface Destination {
  id: string;
  name: string;
  baseCost: number;
  score: number;
  tags: string[];
  weather: { daily: { date: string; tempMaxC: number; condition: string }[] } | null;
}

let socket: Socket;

export default function GroupPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Destination[]>([]);
  const [connected, setConnected] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, number>>(
    Object.fromEntries(TAG_POOL.map((tag) => [tag, 5]))
  );
  const [groupName, setGroupName] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  const [destName, setDestName] = useState("");
  const [destCost, setDestCost] = useState(1000);
  const [destTags, setDestTags] = useState<string[]>([]);
  const [destSubmitting, setDestSubmitting] = useState(false);
  const [destError, setDestError] = useState<string | null>(null);

  useEffect(() => {
    setUserName(localStorage.getItem("name"));

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${groupId}`)
      .then((res) => res.json())
      .then((data) => setGroupName(data.name))
      .catch((err) => console.error("Failed to fetch group info:", err));
  }, [groupId]);

  useEffect(() => {
    const stored = localStorage.getItem("preferences");
    if (stored) {
      try {
        setPreferences(JSON.parse(stored));
      } catch {
        // ignore malformed value
      }
    }
  }, []);

  useEffect(() => {
    const storedUserId = localStorage.getItem("userId");
    setUserId(storedUserId);

    socket = io(process.env.NEXT_PUBLIC_API_URL);

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("joinGroup", groupId);
    });

    socket.on("recommendationsUpdated", (data: { recommendations: Destination[] }) => {
      setRecommendations(data.recommendations);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    return () => {
      socket.disconnect();
    };
  }, [groupId]);

  function toggleDestTag(tag: string) {
    setDestTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleAddDestination(e: React.FormEvent) {
    e.preventDefault();
    if (!destName || destTags.length === 0) return;
    setDestSubmitting(true);
    setDestError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/destinations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: destName, baseCost: destCost, tags: destTags }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to add destination");
      }

      socket.emit("refreshRecommendations", groupId);
      setDestName("");
      setDestCost(1000);
      setDestTags([]);
    } catch (err) {
      setDestError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDestSubmitting(false);
    }
  }

  function handlePreferenceChange(tag: string, value: number) {
    setPreferences((prev) => {
      const updated = { ...prev, [tag]: value };
      if (userId) {
        socket.emit("updatePreferences", { groupId, userId, preferences: updated });
      }
      return updated;
    });
  }

  return (
    <main className="max-w-2xl mx-auto p-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">{groupName ?? "Loading..."}</h1>
        <p className="text-sm text-gray-500">
          You: {userName ?? "unknown"} — {connected ? "🟢 Connected" : "🔴 Disconnected"}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Your Preferences</h2>
        {TAG_POOL.map((tag) => (
          <div key={tag} className="flex flex-col gap-1">
            <div className="flex justify-between text-sm">
              <span>{tag}</span>
              <span className="text-gray-500">{preferences[tag]}</span>
            </div>
            <Slider
              value={[preferences[tag]]}
              min={0}
              max={10}
              step={1}
              onValueChange={(value) => {
                const newValue = Array.isArray(value) ? value[0] : value;
                handlePreferenceChange(tag, newValue);
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 border rounded p-4">
        <h2 className="text-lg font-semibold">Add a Destination</h2>
        <form onSubmit={handleAddDestination} className="flex flex-col gap-3">
          <input
            className="border rounded px-3 py-2"
            placeholder="Place name (e.g. Lisbon, Portugal)"
            value={destName}
            onChange={(e) => setDestName(e.target.value)}
          />
          <div>
            <label className="text-sm font-medium">Estimated cost per person ($)</label>
            <input
              type="number"
              className="border rounded px-3 py-2 w-full mt-1"
              value={destCost}
              onChange={(e) => setDestCost(Number(e.target.value))}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Tags</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {TAG_POOL.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  onClick={() => toggleDestTag(tag)}
                  className={`text-sm px-3 py-1 rounded-full border ${
                    destTags.includes(tag) ? "bg-black text-white" : "bg-white text-black"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
          {destError && <p className="text-red-600 text-sm">{destError}</p>}
          <button
            type="submit"
            disabled={destSubmitting}
            className="bg-black text-white rounded px-4 py-2 w-fit disabled:opacity-50"
          >
            {destSubmitting ? "Adding..." : "Add Destination"}
          </button>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Recommendations</h2>
        {recommendations.length === 0 && (
          <p className="text-gray-500 text-sm">Waiting for recommendations...</p>
        )}
        {recommendations.map((dest) => (
          <div key={dest.id} className="border rounded p-4">
            <div className="flex justify-between">
              <span className="font-medium">{dest.name}</span>
              <span className="text-sm text-gray-500">score: {dest.score.toFixed(2)}</span>
            </div>
            <div className="text-sm text-gray-500">${dest.baseCost} · {dest.tags.join(", ")}</div>
            {dest.weather && dest.weather.daily[0] && (
              <div className="text-sm mt-1">
                {dest.weather.daily[0].condition}, {dest.weather.daily[0].tempMaxC}°C
              </div>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}