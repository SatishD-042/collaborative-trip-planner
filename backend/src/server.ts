import "dotenv/config";
import express from "express";
import http from "http";
import { prisma } from "./db";
import { getRecommendationsForGroup } from "./services/recommendations";
import { getWeatherForecast } from "./services/weather";
import { setupSocket } from "./socket";

const app = express();
app.use(express.json());
app.use(express.static("public"));

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