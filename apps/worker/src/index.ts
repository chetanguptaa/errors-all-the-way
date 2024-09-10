import { createClient } from "redis";
import prisma from "@eatw/db";

const client = createClient();

async function processSubmission(submissionIdJson: string) {
  try {
    const submissionId = JSON.parse(submissionIdJson) as {
      submissionId: string;
    };
    const submission = await prisma.submission.findFirst({
      where: { id: parseInt(submissionId.submissionId) },
    });
    if (submission) {
      console.log(
        `Processing submission for problemId ${submission.problemId}...`
      );
      console.log(`Code: ${submission.code}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      console.log(
        `Finished processing submission for problemId ${submission.problemId}.`
      );

      const result = await client.publish(
        `${submission.id}`,
        JSON.stringify({
          problemId: submission.problemId,
          status: "TLE",
        })
      );
      console.log("Messages published:", result);
    } else {
      console.warn(`No submission found with ID ${submissionId.submissionId}`);
    }
  } catch (error) {
    console.error("Error processing submission:", error);
  }
}

async function startWorker() {
  try {
    await client.connect();
    console.log("Worker connected to Redis.");
    while (true) {
      try {
        const submission = await client.brPop("submissions", 0);
        console.log("submission is this ", submission);

        if (submission !== null) {
          await processSubmission(submission.element);
        }
      } catch (error) {
        console.error("Error processing submission:", error);
      }
    }
  } catch (error) {
    console.error("Failed to connect to Redis", error);
  }
}

startWorker();
