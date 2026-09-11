"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";

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
  const [preferencesInput, setPreferencesInput] = useState('{"Beach": 5, "Nature": 5}');

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

  function handleUpdatePreferences(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;

    try {
      const preferences = JSON.parse(preferencesInput);
      socket.emit("updatePreferences", { groupId, userId, preferences });
    } catch {
      alert("Preferences must be valid JSON");
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-8 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Group: {groupId}</h1>
        <p className="text-sm text-gray-500">
          You: {userId ?? "unknown"} — {connected ? "🟢 Connected" : "🔴 Disconnected"}
        </p>
      </div>

      <form onSubmit={handleUpdatePreferences} className="flex flex-col gap-2">
        <label className="text-sm font-medium">Your Preferences (JSON)</label>
        <textarea
          className="border rounded px-3 py-2 font-mono text-sm"
          rows={3}
          value={preferencesInput}
          onChange={(e) => setPreferencesInput(e.target.value)}
        />
        <button type="submit" className="bg-black text-white rounded px-4 py-2 w-fit">
          Update Preferences
        </button>
      </form>

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