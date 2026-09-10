import "dotenv/config";
import express from "express";
import { prisma } from "./db";
import { rankDestinationsForGroup } from "./engine/rank";
import { toGroupConstraints, toMemberPreferences, toDestinations } from "./adapters";
import { getWeatherForecast } from "./services/weather";


const app = express();
app.use(express.json());

app.post("/groups/:groupId/recommendations", async (req, res) => {
    try {
        const { groupId } = req.params;

        const group = await prisma.group.findUnique({
            where: { id: groupId },
            include: { members: true },
        });

        if (!group) {
            res.status(404).json({ error: "Group not found" });
            return;
        }

        const destinations = await prisma.destination.findMany();

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

        res.json({ groupId, recommendations: rankedWithWeather });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.get("/weather", async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lon = Number(req.query.lon);

    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      res.status(400).json({ error: "lat and lon query params are required numbers" });
      return;
    }

    const forecast = await getWeatherForecast(lat, lon);
    res.json(forecast);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});