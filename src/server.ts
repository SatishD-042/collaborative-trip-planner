import "dotenv/config";
import express from "express";
import { prisma } from "./db";
import { rankDestinationsForGroup } from "./engine/rank";
import { toGroupConstraints, toMemberPreferences, toDestinations } from "./adapters";

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

        res.json({ groupId, recommendations: ranked });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Something went wrong" });
    }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});