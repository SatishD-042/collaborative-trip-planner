export interface Destination {
    id: string;
    name: string;
    baseCost: number;
    latitude: number;
    longitude: number;
    tags: string[];
}

export interface GroupConstraints {
    maxBudget: number;
    maxTravelHours: number;
    originLatitude: number;
    originLongitude: number;
}

export interface MemberPreferences {
    userId: string;
    preferences: Record<string, number>;
    preferredSpend: number;
}

export interface ScoredDestination extends Destination {
    score: number;
    memberScores: Record<string, number>;
}

