import express, { Request, Response } from "express";
import { createClient, ErrorReply } from "redis";
import prisma from "@eatw/db";

const app = express();

const client = createClient();
client.on("error", (err) => console.log("Redis Client Error", err));

app.use(express.json());

app.post("/submit", async (req: Request, res: Response) => {
  const { userId, problemId, code } = req.body;
  try {
    const user = await prisma.user.findFirst({
      where: {
        id: parseInt(userId),
      },
    });
    if (!user) {
      return res.status(400).json({
        error: "user does not exist",
      });
    }
    const problem = await prisma.problem.findFirst({
      where: {
        id: parseInt(problemId),
      },
    });
    if (!problem) {
      return res.status(400).json({
        error: "problem does not exist",
      });
    }
    const submission = await prisma.submission.create({
      data: {
        code: code,
        problemId: parseInt(problemId),
        userId,
      },
    });

    return res.status(200).json({
      message: "Submission received and is getting processed.",
      submissionId: submission.id,
    });
  } catch (error) {
    console.error("some error occured ", error);
    res.status(500).send("Failed to store submission.");
  }
});

async function startServer() {
  try {
    await client.connect();
    console.log("Connected to Redis");
    app.listen(3000, () => {
      console.log("Server is running on port 3000");
    });
  } catch (error) {
    if (error instanceof ErrorReply) console.error("Redis error ", error);
  }
}

startServer();
