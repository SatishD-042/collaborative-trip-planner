const EARTH_RADIUS_KM = 6371;
const AVERAGE_TRAVEL_SPEED_KMH = 800;

function toRadians(deg: number): number {
    return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_KM * c;
}

export function estimateTravelHours(
    originLat: number,
    originLon: number,
    destLat: number,
    destLon: number
): number {
    const distanceKm = haversineDistanceKm(originLat, originLon, destLat, destLon);
    return distanceKm / AVERAGE_TRAVEL_SPEED_KMH;
}