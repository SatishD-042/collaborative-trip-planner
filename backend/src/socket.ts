import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { prisma } from "./db";
import { getRecommendationsForGroup } from "./services/recommendations";

export function setupSocket(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket: Socket) => {
    socket.on("joinGroup", async (groupId: string) => {
      socket.join(groupId);
      const result = await getRecommendationsForGroup(groupId);
      if (result) {
        socket.emit("recommendationsUpdated", result);
      }
    });

    socket.on(
      "updatePreferences",
      async (payload: {
        groupId: string;
        userId: string;
        preferences: Record<string, number>;
        preferredSpend: number;
      }) => {
        const { groupId, userId, preferences, preferredSpend } = payload;

        try {
          await prisma.groupMember.update({
            where: { groupId_userId: { groupId, userId } },
            data: { preferences, preferredSpend },
          });

          io.to(groupId).emit("preferencesUpdated", { userId, preferences, preferredSpend });

          const result = await getRecommendationsForGroup(groupId);
          if (result) {
            io.to(groupId).emit("recommendationsUpdated", result);
          }
        } catch (err) {
          console.error("Failed to update preferences:", err);
          socket.emit("errorEvent", { message: "Failed to update preferences" });
        }
      }
    );

    socket.on("refreshRecommendations", async (groupId: string) => {
      const result = await getRecommendationsForGroup(groupId);
      if (result) {
        io.to(groupId).emit("recommendationsUpdated", result);
      }
    });

    socket.on("disconnect", () => {});
  });

  return io;
}