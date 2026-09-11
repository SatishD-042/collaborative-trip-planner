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
        <h1 className="text-2xl font-bold">Group: {groupId}</h1>
        <p className="text-sm text-gray-500">
          You: {userId ?? "unknown"} — {connected ? "🟢 Connected" : "🔴 Disconnected"}
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