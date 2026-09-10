import { describe, it, expect } from "vitest";
import { filterByConstraints } from "../src/engine/filtering";
import { Destination, GroupConstraints } from "../src/engine/types";

const baseConstraints: GroupConstraints = {
    maxBudget: 1000,
    maxTravelHours: 10,
    originLatitude: 0,
    originLongitude: 0,
};

function makeDestination(overrides: Partial<Destination> = {}): Destination {
    return {
        id: "1",
        name: "Test Destination",
        baseCost: 500,
        latitude: 0.5,
        longitude: 0.5,
        tags: ["Beach"],
        ...overrides,
    };
}

describe("filterByConstraints", () => {
    it("includes a destination within budget and travel time", () => {
        const result = filterByConstraints([makeDestination()], baseConstraints);
        expect(result).toHaveLength(1);
    });

    it("excludes a destination over budget", () => {
        const result = filterByConstraints(
            [makeDestination({ baseCost: 5000})],
            baseConstraints
        );
        expect(result).toHaveLength(0);
    });

    it("excludes a destination too far away", () => {
        const result = filterByConstraints(
            [makeDestination({ latitude: 80, longitude: 80})],
            baseConstraints
        );
        expect(result).toHaveLength(0);
    });

    it("includes a destination at exactly the budget limit", () => {
        const result = filterByConstraints(
            [makeDestination({ baseCost: 1000})],
            baseConstraints
        );
        expect(result).toHaveLength(1);
    });

    it("returns an empty array when given no destinations", () => {
        const result = filterByConstraints([], baseConstraints);
        expect(result).toEqual([]);
    });

    it("returns an empty array when all destinations fail contraints", () => {
        const result = filterByConstraints(
            [makeDestination({ baseCost: 9999 }), makeDestination({ latitude: 89 })],
        baseConstraints
        );
        expect(result).toEqual([]);
    });
});