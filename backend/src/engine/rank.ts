import {
    Destination,
    GroupConstraints,
    MemberPreferences,
    ScoredDestination,
} from "./types";
import { filterByConstraints } from "./filtering";
import { scoreDestinationForGroup } from "./scoring";

export function rankDestinationsForGroup(
    destinations: Destination[],
    constraints: GroupConstraints,
    members: MemberPreferences[]
): ScoredDestination[] {
    const eligible = filterByConstraints(destinations, constraints);

    const scored: ScoredDestination[] = eligible.map((dest) => {
        const { score, memberScores } = scoreDestinationForGroup(dest, members, constraints.maxBudget);
        return { ...dest, score, memberScores };
    });
    
    return scored.sort((a, b) => b.score - a.score);
}