import { Destination, MemberPreferences } from "./types";

export function scoreDestinationForMember(
    destination: Destination,
    member: MemberPreferences
): number {
    if (destination.tags.length === 0) return 0;

    const totalScore = destination.tags.reduce((sum, tag) => {
        const weight = member.preferences[tag] ?? 0;
        return sum + weight;
    }, 0);

    return totalScore / destination.tags.length;
}

export function scoreDestinationForGroup(
    destination: Destination,
    members: MemberPreferences[]
): { score: number; memberScores: Record<string, number> } {
    const memberScores: Record<string, number> = {};

    for (const member of members) {
        memberScores[member.userId] = scoreDestinationForMember(destination, member);
    }

    const scores = Object.values(memberScores);
    const averageScore = scores.length === 0 ? 0 : scores.reduce((a, b) => a + b, 0) / scores.length;

    return { score: averageScore, memberScores };
}