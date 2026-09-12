"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { io, Socket } from "socket.io-client";
import { Slider } from "@/components/ui/slider";
import { getCurrencySymbol } from "@/lib/currency";

const TAG_POOL = [
  "Beach", "Nightlife", "Nature", "Adventure", "Culture",
  "Food", "Relaxation", "Shopping", "Family-Friendly", "Budget",
];

const MIN_TRAVEL_HOURS = 1;
const MAX_TRAVEL_HOURS = 100;

interface Destination {
  id: string;
  name: string;
  baseCost: number;
  score: number;
  tags: string[];
  weather: { daily: { date: string; tempMaxC: number; condition: string }[] } | null;
}

interface SuggestionDestination {
  id: string;
  name: string;
  baseCost: number;
  tags: string[];
}

interface Member {
  userId: string;
  user: { name: string };
}

let socket: Socket;

export default function GroupPage() {
  const params = useParams();
  const groupId = params.groupId as string;

  const [identity, setIdentity] = useState<{ name: string; email: string } | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [emailInput, setEmailInput] = useState("");

  const [userId, setUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [preferences, setPreferences] = useState<Record<string, number>>(
    Object.fromEntries(TAG_POOL.map((tag) => [tag, 5]))
  );
  const [preferredSpend, setPreferredSpend] = useState(0);

  const [groupName, setGroupName] = useState<string | null>(null);
  const [currency, setCurrency] = useState("USD");
  const [maxBudget, setMaxBudget] = useState(0);
  const [maxTravelHours, setMaxTravelHours] = useState(0);
  const [originName, setOriginName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);

  const [newMaxBudget, setNewMaxBudget] = useState(0);
  const [newMaxTravelHours, setNewMaxTravelHours] = useState(0);
  const [newOrigin, setNewOrigin] = useState("");
  const [originError, setOriginError] = useState<string | null>(null);
  const [originSaving, setOriginSaving] = useState(false);

  const [suggestions, setSuggestions] = useState<SuggestionDestination[]>([]);
  const [recommendations, setRecommendations] = useState<Destination[]>([]);
  const [connected, setConnected] = useState(false);

  const [prefOpen, setPrefOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [destOpen, setDestOpen] = useState(false);
  const [destName, setDestName] = useState("");
  const [destCost, setDestCost] = useState("");
  const [destTags, setDestTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [destSubmitting, setDestSubmitting] = useState(false);
  const [destError, setDestError] = useState<string | null>(null);

  const symbol = getCurrencySymbol(currency);

  useEffect(() => {
    const stored = localStorage.getItem("identity");
    if (stored) setIdentity(JSON.parse(stored));
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function refreshGroupInfo() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${groupId}`);
    const data = await res.json();
    setGroupName(data.name);
    setCurrency(data.currency);
    setMaxBudget(data.maxBudget);
    setNewMaxBudget(data.maxBudget);
    setMaxTravelHours(data.maxTravelHours);
    setNewMaxTravelHours(data.maxTravelHours);
    setOriginName(data.originName);
    setMembers(data.members);
  }

  async function refreshSuggestions() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${groupId}/suggestions`);
    const data = await res.json();
    setSuggestions(data.suggestions);
  }

  useEffect(() => {
    if (!identity) return;

    async function joinAndLoad() {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${groupId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: identity!.name, email: identity!.email }),
      });
      const data = await res.json();
      setUserId(data.userId);
      setPreferences(data.preferences);
      setPreferredSpend(data.preferredSpend);
      setIsOwner(data.isOwner);

      await refreshGroupInfo();
      await refreshSuggestions();

      socket = io(process.env.NEXT_PUBLIC_API_URL);
      socket.on("connect", () => {
        setConnected(true);
        socket.emit("joinGroup", groupId);
      });
      socket.on("recommendationsUpdated", (payload: { recommendations: Destination[] }) => {
        setRecommendations(payload.recommendations);
      });
      socket.on("disconnect", () => setConnected(false));
    }

    joinAndLoad();

    return () => {
      if (socket) socket.disconnect();
    };
  }, [identity, groupId]);

  function handleIdentitySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nameInput || !emailInput) return;
    const newIdentity = { name: nameInput, email: emailInput };
    localStorage.setItem("identity", JSON.stringify(newIdentity));
    setIdentity(newIdentity);
  }

  function sendPreferenceUpdate(updatedPreferences: Record<string, number>, updatedSpend: number) {
    if (!userId) return;
    socket.emit("updatePreferences", {
      groupId,
      userId,
      preferences: updatedPreferences,
      preferredSpend: updatedSpend,
    });
  }

  function handleTagChange(tag: string, value: number) {
    setPreferences((prev) => ({ ...prev, [tag]: value }));
  }

  function handleSpendChange(value: number) {
    setPreferredSpend(value);
  }

  function handleUpdatePreferences() {
    sendPreferenceUpdate(preferences, preferredSpend);
  }

  function toggleDestTag(tag: string) {
    setDestTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  function addCustomTag() {
    const trimmed = customTagInput.trim();
    if (trimmed && !destTags.includes(trimmed)) {
      setDestTags((prev) => [...prev, trimmed]);
    }
    setCustomTagInput("");
  }

  function removeCustomTag(tag: string) {
    setDestTags((prev) => prev.filter((t) => t !== tag));
  }

  const customTags = destTags.filter((t) => !TAG_POOL.includes(t));
  const parsedCost = Number(destCost);
  const canSubmitDestination =
    destName.trim().length > 0 && destCost.length > 0 && parsedCost > 0 && destTags.length > 0;

  async function handleAddDestination(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmitDestination) return;
    setDestSubmitting(true);
    setDestError(null);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/destinations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: destName, baseCost: parsedCost, tags: destTags, groupId }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to add destination");
      }

      socket.emit("refreshRecommendations", groupId);
      await refreshSuggestions();
      setDestName("");
      setDestCost("");
      setDestTags([]);
      setCustomTagInput("");
      setDestOpen(false);
    } catch (err) {
      setDestError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDestSubmitting(false);
    }
  }

  async function handleAddSuggestion(destinationId: string) {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${groupId}/destinations/${destinationId}`, {
      method: "POST",
    });
    socket.emit("refreshRecommendations", groupId);
    setSuggestions((prev) => prev.filter((s) => s.id !== destinationId));
  }

  async function handleSaveMaxBudget() {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxBudget: newMaxBudget }),
    });
    setMaxBudget(newMaxBudget);
    socket.emit("refreshRecommendations", groupId);
  }

  async function handleSaveMaxTravelHours() {
    if (newMaxTravelHours < MIN_TRAVEL_HOURS || newMaxTravelHours > MAX_TRAVEL_HOURS) return;
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${groupId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ maxTravelHours: newMaxTravelHours }),
    });
    setMaxTravelHours(newMaxTravelHours);
    socket.emit("refreshRecommendations", groupId);
  }

  async function handleSaveOrigin() {
    if (!newOrigin.trim()) return;
    setOriginSaving(true);
    setOriginError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ origin: newOrigin }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to update origin");
      }
      const updated = await res.json();
      setOriginName(updated.originName);
      setNewOrigin("");
      socket.emit("refreshRecommendations", groupId);
    } catch (err) {
      setOriginError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setOriginSaving(false);
    }
  }

  if (!identity) {
    return (
      <main className="max-w-sm mx-auto p-8 flex flex-col gap-4">
        <h1 className="text-xl font-bold">Who are you?</h1>
        <form onSubmit={handleIdentitySubmit} className="flex flex-col gap-3">
          <input className="border rounded px-3 py-2" placeholder="Your name" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
          <input type="email" className="border rounded px-3 py-2" placeholder="Your email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} />
          <button type="submit" className="bg-black text-white rounded px-4 py-2">Continue</button>
        </form>
      </main>
    );
  }

  return (
    <main className="max-w-2xl mx-auto p-8 flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{groupName ?? "Loading..."}</h1>
          <p className="text-sm text-gray-500">
            {connected ? "🟢 Connected" : "🔴 Disconnected"}
            {originName && <> · Traveling from {originName}</>}
          </p>
        </div>

        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-medium"
          >
            {identity.name[0]?.toUpperCase() ?? "?"}
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-72 border rounded bg-white shadow-lg p-4 z-10">
              <h3 className="font-medium mb-2 text-sm">Members</h3>
              <ul className="text-sm flex flex-col gap-1 mb-3">
                {members.map((m) => (
                  <li key={m.userId}>{m.user.name}</li>
                ))}
              </ul>

              {isOwner && (
                <div className="flex flex-col gap-3 border-t pt-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Group ID (share to invite):</p>
                    <div className="flex gap-2">
                      <input readOnly value={groupId} className="text-xs border rounded px-2 py-1 flex-1" />
                      <button
                        onClick={() => navigator.clipboard.writeText(groupId)}
                        className="text-xs bg-black text-white rounded px-2 py-1"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Group max budget ({symbol}):</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={newMaxBudget}
                        onChange={(e) => setNewMaxBudget(Number(e.target.value))}
                        className="text-xs border rounded px-2 py-1 flex-1"
                      />
                      <button onClick={handleSaveMaxBudget} className="text-xs bg-black text-white rounded px-2 py-1">
                        Save
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">
                      Max travel hours ({MIN_TRAVEL_HOURS}–{MAX_TRAVEL_HOURS}):
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min={MIN_TRAVEL_HOURS}
                        max={MAX_TRAVEL_HOURS}
                        value={newMaxTravelHours}
                        onChange={(e) => setNewMaxTravelHours(Number(e.target.value))}
                        className="text-xs border rounded px-2 py-1 flex-1"
                      />
                      <button onClick={handleSaveMaxTravelHours} className="text-xs bg-black text-white rounded px-2 py-1">
                        Save
                      </button>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-500 mb-1">Origin location:</p>
                    <div className="flex gap-2">
                      <input
                        placeholder={originName || "e.g. Mumbai, India"}
                        value={newOrigin}
                        onChange={(e) => setNewOrigin(e.target.value)}
                        className="text-xs border rounded px-2 py-1 flex-1"
                      />
                      <button
                        onClick={handleSaveOrigin}
                        disabled={originSaving}
                        className="text-xs bg-black text-white rounded px-2 py-1 disabled:opacity-50"
                      >
                        {originSaving ? "..." : "Save"}
                      </button>
                    </div>
                    {originError && <p className="text-xs text-red-600 mt-1">{originError}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <button
          onClick={() => setPrefOpen((prev) => !prev)}
          className="w-full flex items-center justify-between border rounded px-4 py-2"
        >
          <span className="text-sm font-medium">Tag preferences</span>
          <span>{prefOpen ? "▲" : "▼"}</span>
        </button>

        {prefOpen && (
          <div className="flex flex-col gap-4 mt-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span>Preferred spend</span>
                <span className="text-gray-500">{symbol}{preferredSpend}</span>
              </div>
              <Slider
                value={[preferredSpend]}
                min={0}
                max={maxBudget || 1}
                step={Math.max(1, Math.round((maxBudget || 1) / 50))}
                onValueChange={(value) => {
                  const v = Array.isArray(value) ? value[0] : value;
                  handleSpendChange(v);
                }}
              />
            </div>
            {TAG_POOL.map((tag) => (
              <div key={tag}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{tag}</span>
                  <span className="text-gray-500">{preferences[tag]}</span>
                </div>
                <Slider
                  value={[preferences[tag]]}
                  min={0}
                  max={10}
                  step={1}
                  onValueChange={(value) => {
                    const v = Array.isArray(value) ? value[0] : value;
                    handleTagChange(tag, v);
                  }}
                />
              </div>
            ))}
            <button
              onClick={handleUpdatePreferences}
              className="bg-black text-white rounded px-4 py-2 w-fit"
            >
              Update Preferences
            </button>
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => setDestOpen((prev) => !prev)}
          className="w-full flex items-center justify-between border rounded px-4 py-2"
        >
          <span className="text-sm font-medium">Add destination</span>
          <span>{destOpen ? "▲" : "▼"}</span>
        </button>

        {destOpen && (
          <form onSubmit={handleAddDestination} className="flex flex-col gap-3 mt-4 border rounded p-4">
            <input
              className="border rounded px-3 py-2"
              placeholder="Place name (e.g. Lisbon, Portugal)"
              value={destName}
              onChange={(e) => setDestName(e.target.value)}
            />
            <div>
              <label className="text-sm font-medium">Estimated cost per person ({symbol})</label>
              <input
                type="number"
                className="border rounded px-3 py-2 w-full mt-1"
                placeholder="Required"
                value={destCost}
                onChange={(e) => setDestCost(e.target.value)}
              />
            </div>

            {destName.trim().length > 0 && (
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

                {customTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {customTags.map((tag) => (
                      <span key={tag} className="text-sm px-3 py-1 rounded-full bg-black text-white flex items-center gap-1">
                        {tag}
                        <button type="button" onClick={() => removeCustomTag(tag)} className="text-xs">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mt-2">
                  <input
                    className="border rounded px-2 py-1 text-sm flex-1"
                    placeholder="Add a custom tag"
                    value={customTagInput}
                    onChange={(e) => setCustomTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomTag();
                      }
                    }}
                  />
                  <button type="button" onClick={addCustomTag} className="text-sm border rounded px-3 py-1">
                    Add
                  </button>
                </div>
              </div>
            )}

            {destError && <p className="text-red-600 text-sm">{destError}</p>}
            <button
              type="submit"
              disabled={destSubmitting || !canSubmitDestination}
              className="bg-black text-white rounded px-4 py-2 w-fit disabled:opacity-50"
            >
              {destSubmitting ? "Adding..." : "Add Destination"}
            </button>
          </form>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Ranked shortlist</h2>
        {recommendations.length === 0 && (
          <p className="text-gray-500 text-sm">Add a destination or a suggestion to see rankings.</p>
        )}
        {recommendations.map((dest) => (
          <div key={dest.id} className="border rounded p-4">
            <div className="flex justify-between">
              <span className="font-medium">{dest.name}</span>
              <span className="text-sm text-gray-500">score: {dest.score.toFixed(2)}</span>
            </div>
            <div className="text-sm text-gray-500">{symbol}{dest.baseCost} · {dest.tags.join(", ")}</div>
            {dest.weather && dest.weather.daily[0] && (
              <div className="text-sm mt-1">
                {dest.weather.daily[0].condition}, {dest.weather.daily[0].tempMaxC}°C
              </div>
            )}
          </div>
        ))}
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-2">Destination suggestions</h2>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {suggestions.length === 0 && <p className="text-gray-500 text-sm">No more suggestions.</p>}
          {suggestions.map((s) => (
            <div key={s.id} className="flex-none w-40 border rounded p-3">
              <p className="text-sm font-medium">{s.name}</p>
              <p className="text-xs text-gray-500 mb-2">{symbol}{s.baseCost} · {s.tags.join(", ")}</p>
              <button
                onClick={() => handleAddSuggestion(s.id)}
                className="w-full text-xs border rounded px-2 py-1"
              >
                + Add
              </button>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}