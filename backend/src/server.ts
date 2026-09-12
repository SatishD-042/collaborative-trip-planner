import "dotenv/config";
import express from "express";
import http from "http";
import { prisma } from "./db";
import { getRecommendationsForGroup } from "./services/recommendations";
import { getWeatherForecast } from "./services/weather";
import { setupSocket } from "./socket";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

app.post("/destinations", async (req, res) => {
  try {
    const { name, baseCost, tags } = req.body as {
      name?: string;
      baseCost?: number;
      tags?: string[];
    };

    if (!name || typeof baseCost !== "number" || !Array.isArray(tags) || tags.length === 0) {
      res.status(400).json({ error: "name, baseCost (number), and at least one tag are required" });
      return;
    }

    const apiKey = process.env.OPENWEATHER_API_KEY;
    const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(name)}&limit=1&appid=${apiKey}`;
    const geoRes = await fetch(geoUrl);

    if (!geoRes.ok) {
      res.status(502).json({ error: "Geocoding request failed" });
      return;
    }

    const geoData = await geoRes.json();

    if (!Array.isArray(geoData) || geoData.length === 0) {
      res.status(400).json({ error: `Could not find a location matching "${name}"` });
      return;
    }

    const match = geoData[0];
    const resolvedName = match.state
      ? `${match.name}, ${match.state}, ${match.country}`
      : `${match.name}, ${match.country}`;

    const destination = await prisma.destination.create({
      data: {
        name: resolvedName,
        baseCost,
        latitude: match.lat,
        longitude: match.lon,
        tags,
      },
    });

    res.json(destination);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/groups", async (req, res) => {
  try {
    const { name, startDate, endDate, maxBudget, maxTravelHours, originLatitude, originLongitude } = req.body;

    if (!name || !startDate || !endDate || typeof maxBudget !== "number" || typeof maxTravelHours !== "number") {
      res.status(400).json({ error: "Missing or invalid fields" });
      return;
    }

    const group = await prisma.group.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        maxBudget,
        maxTravelHours,
        originLatitude: originLatitude ?? 40.7128,
        originLongitude: originLongitude ?? -74.006,
      },
    });

    res.json({ groupId: group.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

const TAG_POOL = [
  "Beach", "Nightlife", "Nature", "Adventure", "Culture",
  "Food", "Relaxation", "Shopping", "Family-Friendly", "Budget",
];

app.post("/groups/:groupId/join", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, email } = req.body as { name?: string; email?: string };

    if (!name || !email) {
      res.status(400).json({ error: "name and email are required" });
      return;
    }

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { name, email },
    });

    const existingMember = await prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });

    let preferences: Record<string, number>;

    if (existingMember) {
      preferences = existingMember.preferences as Record<string, number>;
    } else {
      preferences = Object.fromEntries(TAG_POOL.map((tag) => [tag, 5]));
      await prisma.groupMember.create({ data: { groupId, userId: user.id, preferences } });
    }

    res.json({ userId: user.id, preferences });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/groups/:groupId/recommendations", async (req, res) => {
  try {
    const result = await getRecommendationsForGroup(req.params.groupId);
    if (!result) {
      res.status(404).json({ error: "Group not found" });
      return;
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/groups/:groupId", async (req, res) => {
  const group = await prisma.group.findUnique({
    where: { id: req.params.groupId },
    include: { members: true },
  });
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  res.json(group);
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

const httpServer = http.createServer(app);
setupSocket(httpServer);

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});