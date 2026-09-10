import { describe, it, expect } from "vitest";
import {
  scoreDestinationForMember,
  scoreDestinationForGroup,
} from "../src/engine/scoring";
import { Destination, MemberPreferences } from "../src/engine/types";

const destination: Destination = {
  id: "1",
  name: "Test Destination",
  baseCost: 500,
  latitude: 0,
  longitude: 0,
  tags: ["Beach", "Nature"],
};

describe("scoreDestinationForMember", () => {
  it("averages weights of matched tags", () => {
    const member: MemberPreferences = {
      userId: "u1",
      preferences: { Beach: 10, Nature: 6 },
    };
    expect(scoreDestinationForMember(destination, member)).toBe(8);
  });

  it("treats an unmatched tag as weight 0", () => {
    const member: MemberPreferences = {
      userId: "u1",
      preferences: { Beach: 10 },
    };
    expect(scoreDestinationForMember(destination, member)).toBe(5);
  });

  it("returns 0 when the destination has no tags", () => {
    const noTagsDestination: Destination = { ...destination, tags: [] };
    const member: MemberPreferences = {
      userId: "u1",
      preferences: { Beach: 10 },
    };
    expect(scoreDestinationForMember(noTagsDestination, member)).toBe(0);
  });

  it("returns 0 when the member has no preferences at all", () => {
    const member: MemberPreferences = { userId: "u1", preferences: {} };
    expect(scoreDestinationForMember(destination, member)).toBe(0);
  });
});

describe("scoreDestinationForGroup", () => {
  it("averages scores across multiple members", () => {
    const members: MemberPreferences[] = [
      { userId: "u1", preferences: { Beach: 10, Nature: 10 } },
      { userId: "u2", preferences: { Beach: 0, Nature: 0 } },
    ];
    const { score, memberScores } = scoreDestinationForGroup(destination, members);
    expect(score).toBe(5);
    expect(memberScores).toEqual({ u1: 10, u2: 0 });
  });

  it("returns 0 and an empty memberScores when there are no members", () => {
    const { score, memberScores } = scoreDestinationForGroup(destination, []);
    expect(score).toBe(0);
    expect(memberScores).toEqual({});
  });
});