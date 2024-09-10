import { createClient, RedisClientType } from "redis";
import { User } from "../types";

export class PubSubManager {
  private static instance: PubSubManager;
  private redisClient: RedisClientType;
  private subscriptions: Map<number, User[]>;

  private constructor() {
    this.redisClient = createClient();
    this.subscriptions = new Map();
  }

  public static getInstance(): PubSubManager {
    if (!PubSubManager.instance) {
      PubSubManager.instance = new PubSubManager();
    }
    return PubSubManager.instance;
  }

  private async connectClient() {
    try {
      await this.redisClient.connect();
      console.log("Redis client connected.");
    } catch (error) {
      console.error("Error connecting to Redis:", error);
      throw error;
    }
  }

  public async userSubscribe(user: User, submissionId: number) {
    if (!this.subscriptions.has(submissionId)) {
      this.subscriptions.set(submissionId, []);
    }
    this.subscriptions.get(submissionId)?.push(user);

    if (this.subscriptions.get(submissionId)?.length === 1) {
      try {
        await this.connectClient();
        await this.redisClient.subscribe(`${submissionId}`, (message: any) => {
          console.log("message is this ", message);
          this.handleMessage(submissionId, message);
        });
        console.log(`Subscribed to Redis channel: ${submissionId}`);
      } catch (error) {
        console.error("Error subscribing to Redis channel:", error);
      }
    }
  }

  public async userUnSubscribe(user: User, submissionId: number) {
    const subscribers = this.subscriptions.get(submissionId);
    if (subscribers) {
      this.subscriptions.set(
        submissionId,
        subscribers.filter((sub) => sub.id !== user.id)
      );

      if (this.subscriptions.get(submissionId)?.length === 0) {
        try {
          await this.redisClient.unsubscribe(`${submissionId}`);
          console.log(`Unsubscribed from Redis channel: ${submissionId}`);
        } catch (error) {
          console.error("Error unsubscribing from Redis channel:", error);
        }
      }
    }
  }

  private handleMessage(submissionId: number, message: string) {
    console.log(`Message received on channel ${submissionId}: ${message}`);
    this.subscriptions.get(submissionId)?.forEach((sub) => {
      console.log(`Sending message to user: ${sub}`);
      sub.ws.send(message.toString());
    });
  }

  public async disconnect() {
    try {
      await this.redisClient.quit();
      console.log("Redis client disconnected.");
    } catch (error) {
      console.error("Error disconnecting from Redis:", error);
    }
  }
}

export const pubSubManager = PubSubManager.getInstance();
