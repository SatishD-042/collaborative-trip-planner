import { Destination, MemberPreferences } from "./types";

function scoreBudgetFit(baseCost: number, preferredSpend: number, maxBudget: number): number {
    if (baseCost <= preferredSpend) return 10;
    if (maxBudget <= preferredSpend) return 10;
    const ratio = (baseCost - preferredSpend) / (maxBudget - preferredSpend);
    return Math.max(0, 10 * (1 - ratio));
}

export function scoreDestinationForMember(
    destination: Destination,
    member: MemberPreferences,
    maxBudget: number
): number {
    const tagWeights = destination.tags.map((tag) => member.preferences[tag] ?? 0);
    const budgetFit = scoreBudgetFit(destination.baseCost, member.preferredSpend, maxBudget);

    const allScores = [...tagWeights, budgetFit];
    return allScores.reduce((sum, s) => sum + s, 0) / allScores.length;

}

export function scoreDestinationForGroup(
    destination: Destination,
    members: MemberPreferences[],
    maxBudget: number
): { score: number; memberScores: Record<string, number> } {
    const memberScores: Record<string, number> = {};

    for (const member of members) {
        memberScores[member.userId] = scoreDestinationForMember(destination, member, maxBudget);
    }

    const scores = Object.values(memberScores);
    const averageScore = scores.length === 0 ? 0 : scores.reduce((a, b) => a + b, 0) / scores.length;

    return { score: averageScore, memberScores };
}