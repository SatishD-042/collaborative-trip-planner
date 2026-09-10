import { describe, it, expect } from "vitest";
import { rankDestinationsForGroup } from "../src/engine/rank";
import { Destination, GroupConstraints, MemberPreferences } from "../src/engine/types";

const constraints: GroupConstraints = {
  maxBudget: 1000,
  maxTravelHours: 10,
  originLatitude: 0,
  originLongitude: 0,
};

const members: MemberPreferences[] = [
  { userId: "u1", preferences: { Beach: 10, Nature: 2 } },
  { userId: "u2", preferences: { Beach: 2, Nature: 10 } },
];

const destinations: Destination[] = [
  { id: "1", name: "Beachy Place", baseCost: 500, latitude: 0.1, longitude: 0.1, tags: ["Beach"] },
  { id: "2", name: "Nature Place", baseCost: 500, latitude: 0.2, longitude: 0.2, tags: ["Nature"] },
  { id: "3", name: "Too Expensive", baseCost: 5000, latitude: 0.1, longitude: 0.1, tags: ["Beach"] },
];

describe("rankDestinationsForGroup", () => {
  it("filters out over-budget destinations before scoring", () => {
    const result = rankDestinationsForGroup(destinations, constraints, members);
    expect(result.find((d) => d.id === "3")).toBeUndefined();
  });

  it("sorts remaining destinations by descending score", () => {
    const result = rankDestinationsForGroup(destinations, constraints, members);
    expect(result[0]!.score).toBeGreaterThanOrEqual(result[1]!.score);
  });

  it("returns an empty array when no destinations pass constraints", () => {
    const result = rankDestinationsForGroup(
      [{ id: "1", name: "Far", baseCost: 500, latitude: 89, longitude: 89, tags: ["Beach"] }],
      constraints,
      members
    );
    expect(result).toEqual([]);
  });

  it("returns an empty array when given no destinations at all", () => {
    const result = rankDestinationsForGroup([], constraints, members);
    expect(result).toEqual([]);
  });

  it("includes correct per-member scores in the output", () => {
    const result = rankDestinationsForGroup(destinations, constraints, members);
    const beachy = result.find((d) => d.id === "1");
    expect(beachy?.memberScores).toEqual({ u1: 10, u2: 2 });
  });
});