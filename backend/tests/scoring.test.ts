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

const maxBudget = 1000;

describe("scoreDestinationForMember", () => {
  it("averages tag weights with budget fit when cost matches preferred spend", () => {
    const member: MemberPreferences = {
      userId: "u1",
      preferences: { Beach: 10, Nature: 6 },
      preferredSpend: 500,
    };
    expect(scoreDestinationForMember(destination, member, maxBudget)).toBeCloseTo(26 / 3);
  });

  it("treats an unmatched tag as weight 0, budget fit still included", () => {
    const member: MemberPreferences = {
      userId: "u1",
      preferences: { Beach: 10 },
      preferredSpend: 500,
    };
    expect(scoreDestinationForMember(destination, member, maxBudget)).toBeCloseTo(20 / 3);
  });

  it("scores budget fit lower as cost exceeds preferred spend", () => {
    const expensiveDest: Destination = { ...destination, baseCost: 800 };
    const member: MemberPreferences = {
      userId: "u1",
      preferences: { Beach: 10, Nature: 6 },
      preferredSpend: 200,
    };
    expect(scoreDestinationForMember(expensiveDest, member, maxBudget)).toBeCloseTo(18.5 / 3);
  });

  it("relies only on budget fit when destination has no tags", () => {
    const noTagsDestination: Destination = { ...destination, tags: [] };
    const member: MemberPreferences = { userId: "u1", preferences: {}, preferredSpend: 500 };
    expect(scoreDestinationForMember(noTagsDestination, member, maxBudget)).toBe(10);
  });

  it("scores 0 across the board when tags and budget both mismatch", () => {
    const member: MemberPreferences = { userId: "u1", preferences: {}, preferredSpend: 0 };
    const atCapDestination: Destination = { ...destination, baseCost: maxBudget };
    expect(scoreDestinationForMember(atCapDestination, member, maxBudget)).toBe(0);
  });
});

describe("scoreDestinationForGroup", () => {
  it("averages scores across multiple members", () => {
    const members: MemberPreferences[] = [
      { userId: "u1", preferences: { Beach: 10, Nature: 10 }, preferredSpend: 500 },
      { userId: "u2", preferences: { Beach: 0, Nature: 0 }, preferredSpend: 500 },
    ];
    const { score, memberScores } = scoreDestinationForGroup(destination, members, maxBudget);
    expect(memberScores.u1).toBeCloseTo(30 / 3);
    expect(memberScores.u2).toBeCloseTo(10 / 3);
    expect(score).toBeCloseTo((30 / 3 + 10 / 3) / 2);
  });

  it("returns 0 and empty memberScores when there are no members", () => {
    const { score, memberScores } = scoreDestinationForGroup(destination, [], maxBudget);
    expect(score).toBe(0);
    expect(memberScores).toEqual({});
  });
});