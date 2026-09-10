import { describe, it, expect } from "vitest";
import { haversineDistanceKm, estimateTravelHours } from "../src/engine/geo";

describe("haversineDistanceKm", () => {
    it("returns 0 for identical coordinates", () => {
        expect(haversineDistanceKm(10, 10, 10, 10)).toBeCloseTo(0);
    });

    it("returns a realistic distance for known coordinates (NYC to London)", () => {
        const distance = haversineDistanceKm(40.7128, -74.006, 51.5074, -0.1278);
        expect(distance).toBeGreaterThan(5400);
        expect(distance).toBeLessThan(5700);
    });

    it("is symmetric - distance A to B equals B to A", () => {
        const ab = haversineDistanceKm(10, 20, 30, 40);
        const ba = haversineDistanceKm(30, 40, 10, 20);
        expect(ab).toBeCloseTo(ba);
    });
});

describe("estimateTravelHours", () => {
    it("returns 0 for identical coordinates", () => {
        expect(estimateTravelHours(0, 0, 0, 0)).toBe(0);
    });

    it("scales proportionally with distance - farther means more hours", () => {
        const short = estimateTravelHours(0, 0, 1, 0);
        const long = estimateTravelHours(0, 0, 10, 0);
        expect(long).toBeGreaterThan(short);
    });
});