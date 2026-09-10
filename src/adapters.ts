import { Group, GroupMember, Destination as PrismaDestination } from "@prisma/client";
import { GroupConstraints, MemberPreferences, Destination } from "./engine/types";

export function toGroupConstraints(group: Group): GroupConstraints {
    return {
        maxBudget: group.maxBudget,
        maxTravelHours: group.maxTravelHours,
        originLatitude: group.originLatitude,
        originLongitude: group.originLongitude,
    };
}

export function toMemberPreferences(members: GroupMember[]): MemberPreferences[] {
    return members.map((m) => ({
        userId: m.userId,
        preferences: (m.preferences ?? {}) as Record<string, number>,
    }));
}

export function toDestinations(destinations: PrismaDestination[]): Destination[] {
    return destinations.map((d) => ({
        id: d.id,
        name: d.name,
        baseCost: d.baseCost,
        latitude: d.latitude,
        longitude: d.longitude,
        tags: d.tags,
    }));
}