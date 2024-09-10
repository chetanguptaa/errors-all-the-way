import { WebSocketServer } from "ws";
import { SUBSCRIBE } from "./constants";
import { pubSubManager } from "./managers/PubSubManager";
import { createClient } from "redis";
import prisma from "@eatw/db";
import { User } from "./types";

const wss = new WebSocketServer({ port: 8080 });

wss.on("connection", async (ws) => {
  const client = createClient();
  await client.connect();
  client.on("error", (err) => console.log("Redis Client Error", err));
  const userId = 1;
  ws.on("message", async (data) => {
    const message = JSON.parse(data.toString());
    const user: User = {
      id: userId,
      ws,
    };
    if (message.type === SUBSCRIBE) {
      // here we'll check if the user is authenticated to see that submission
      const submissionId = message.payload.submissionId as string;
      const submission = await prisma.submission.findFirst({
        where: {
          id: parseInt(submissionId),
        },
      });
      if (!submission) {
        console.log("hi there");

        return;
      } else {
        await client.lPush(
          "submissions",
          JSON.stringify({
            submissionId: submission.id,
          })
        );
        await pubSubManager.userSubscribe(user, parseInt(submissionId));
      }
    }
  });
  ws.on("close", async () => {
    await pubSubManager.disconnect();
  });
});
