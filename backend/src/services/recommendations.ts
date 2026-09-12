import { prisma } from "../db";
import { rankDestinationsForGroup } from "../engine/rank";
import { toGroupConstraints, toMemberPreferences, toDestinations } from "../adapters";
import { getWeatherForecast } from "./weather";

export async function getRecommendationsForGroup(groupId: string) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: { members: true },
  });

  if (!group) {
    return null;
  }

  const destinations = await prisma.destination.findMany({
    where: { groupDestinations: { some: { groupId } } },
  });

  const constraints = toGroupConstraints(group);
  const members = toMemberPreferences(group.members);
  const engineDestinations = toDestinations(destinations);

  const ranked = rankDestinationsForGroup(engineDestinations, constraints, members);

  const rankedWithWeather = await Promise.all(
    ranked.map(async (dest) => {
      try {
        const weather = await getWeatherForecast(dest.latitude, dest.longitude);
        return { ...dest, weather };
      } catch (err) {
        console.error(`Weather fetch failed for "${dest.name}":`, err);
        return { ...dest, weather: null };
      }
    })
  );

  return { groupId, recommendations: rankedWithWeather };
}