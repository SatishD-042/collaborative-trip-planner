import { Destination, GroupConstraints } from "./types";
import { estimateTravelHours } from "./geo";

export function filterByConstraints(
    destinations: Destination[],
    constraints: GroupConstraints
): Destination[] {
    return destinations.filter((dest) => {
        const withinBudget = dest.baseCost <= constraints.maxBudget;

        const travelHours = estimateTravelHours(
            constraints.originLatitude,
            constraints.originLongitude,
            dest.latitude,
            dest.longitude
        );
        const withinTravelTime = travelHours <= constraints.maxTravelHours;

        return withinBudget && withinTravelTime;
    });
}