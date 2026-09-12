import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { prisma } from "./db";
import { getRecommendationsForGroup } from "./services/recommendations";
import { getWeatherForecast } from "./services/weather";
import { geocodePlace } from "./services/geocode";
import { setupSocket } from "./socket";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const TAG_POOL = [
  "Beach", "Nightlife", "Nature", "Adventure", "Culture",
  "Food", "Relaxation", "Shopping", "Family-Friendly", "Budget",
];

const MIN_TRAVEL_HOURS = 1;
const MAX_TRAVEL_HOURS = 100;
const ALLOWED_CURRENCIES = ["USD", "EUR", "GBP", "INR", "JPY", "AUD", "CAD"];

app.post("/groups", async (req, res) => {
  try {
    const { name, startDate, endDate, maxBudget, maxTravelHours, currency, origin } = req.body;

    if (!name || !startDate || !endDate || typeof maxBudget !== "number") {
      res.status(400).json({ error: "Missing or invalid fields" });
      return;
    }

    if (
      typeof maxTravelHours !== "number" ||
      maxTravelHours < MIN_TRAVEL_HOURS ||
      maxTravelHours > MAX_TRAVEL_HOURS
    ) {
      res.status(400).json({
        error: `maxTravelHours must be between ${MIN_TRAVEL_HOURS} and ${MAX_TRAVEL_HOURS}`,
      });
      return;
    }

    if (!origin || typeof origin !== "string") {
      res.status(400).json({ error: "origin is required" });
      return;
    }

    const geo = await geocodePlace(origin);
    if (!geo) {
      res.status(400).json({ error: `Could not find a location matching "${origin}"` });
      return;
    }

    const resolvedCurrency = ALLOWED_CURRENCIES.includes(currency) ? currency : "USD";

    const group = await prisma.group.create({
      data: {
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        maxBudget,
        maxTravelHours,
        currency: resolvedCurrency,
        originLatitude: geo.lat,
        originLongitude: geo.lon,
        originName: geo.name,
      },
    });

    res.json({ groupId: group.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.patch("/groups/:groupId", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { maxBudget, maxTravelHours, origin } = req.body as {
      maxBudget?: number;
      maxTravelHours?: number;
      origin?: string;
    };

    const data: {
      maxBudget?: number;
      maxTravelHours?: number;
      originLatitude?: number;
      originLongitude?: number;
      originName?: string;
    } = {};

    if (typeof maxBudget === "number") {
      data.maxBudget = maxBudget;
    }

    if (typeof maxTravelHours === "number") {
      if (maxTravelHours < MIN_TRAVEL_HOURS || maxTravelHours > MAX_TRAVEL_HOURS) {
        res.status(400).json({
          error: `maxTravelHours must be between ${MIN_TRAVEL_HOURS} and ${MAX_TRAVEL_HOURS}`,
        });
        return;
      }
      data.maxTravelHours = maxTravelHours;
    }

    if (typeof origin === "string" && origin.trim().length > 0) {
      const geo = await geocodePlace(origin);
      if (!geo) {
        res.status(400).json({ error: `Could not find a location matching "${origin}"` });
        return;
      }
      data.originLatitude = geo.lat;
      data.originLongitude = geo.lon;
      data.originName = geo.name;
    }

    if (Object.keys(data).length === 0) {
      res.status(400).json({ error: "No valid fields to update" });
      return;
    }

    const group = await prisma.group.update({ where: { id: groupId }, data });
    res.json(group);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/groups/:groupId", async (req, res) => {
  const group = await prisma.group.findUnique({
    where: { id: req.params.groupId },
    include: { members: { include: { user: true } } },
  });
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  res.json(group);
});

app.post("/groups/:groupId/join", async (req, res) => {
  try {
    const { groupId } = req.params;
    const { name, email, isOwner } = req.body as { name?: string; email?: string; isOwner?: boolean };

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
    let preferredSpend: number;
    let ownerStatus = existingMember?.isOwner ?? false;

    if (existingMember) {
      preferences = existingMember.preferences as Record<string, number>;
      preferredSpend = existingMember.preferredSpend;
    } else {
      preferences = Object.fromEntries(TAG_POOL.map((tag) => [tag, 5]));
      preferredSpend = group.maxBudget / 2;
      ownerStatus = isOwner === true;
      await prisma.groupMember.create({
        data: { groupId, userId: user.id, preferences, preferredSpend, isOwner: ownerStatus },
      });
    }

    res.json({ userId: user.id, preferences, preferredSpend, isOwner: ownerStatus });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.get("/groups/:groupId/suggestions", async (req, res) => {
  try {
    const { groupId } = req.params;
    const suggestions = await prisma.destination.findMany({
      where: { NOT: { groupDestinations: { some: { groupId } } } },
    });
    res.json({ suggestions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/groups/:groupId/destinations/:destinationId", async (req, res) => {
  try {
    const { groupId, destinationId } = req.params;

    const group = await prisma.group.findUnique({ where: { id: groupId } });
    if (!group) {
      res.status(404).json({ error: "Group not found" });
      return;
    }

    const destination = await prisma.destination.findUnique({ where: { id: destinationId } });
    if (!destination) {
      res.status(404).json({ error: "Destination not found" });
      return;
    }

    await prisma.groupDestination.upsert({
      where: { groupId_destinationId: { groupId, destinationId } },
      update: {},
      create: { groupId, destinationId },
    });

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

app.post("/destinations", async (req, res) => {
  try {
    const { name, baseCost, tags, groupId } = req.body as {
      name?: string;
      baseCost?: number;
      tags?: string[];
      groupId?: string;
    };

    if (!name || typeof baseCost !== "number" || !Array.isArray(tags) || tags.length === 0 || !groupId) {
      res.status(400).json({ error: "name, baseCost, tags, and groupId are required" });
      return;
    }

    const geo = await geocodePlace(name);
    if (!geo) {
      res.status(400).json({ error: `Could not find a location matching "${name}"` });
      return;
    }

    const destination = await prisma.destination.create({
      data: {
        name: geo.name,
        baseCost,
        latitude: geo.lat,
        longitude: geo.lon,
        tags,
      },
    });

    await prisma.groupDestination.create({
      data: { groupId, destinationId: destination.id },
    });

    res.json(destination);
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

app.get("/users/:email/groups", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await prisma.user.findUnique({
      where: { email },
      include: { groupMemberships: { include: { group: true } } },
    });

    if (!user) {
      res.json({ groups: [] });
      return;
    }

    const groups = user.groupMemberships.map((m) => ({
      groupId: m.groupId,
      groupName: m.group.name,
      isOwner: m.isOwner,
    }));

    res.json({ groups });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  }
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