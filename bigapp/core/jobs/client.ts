import { ObjectId } from "mongodb";
import { jobs } from "@/core/db/collections";
import { Job, JobTypeSchema, JobStatusSchema } from "@/core/schema/job";
import { z } from "zod";

type JobType = z.infer<typeof JobTypeSchema>;

export class JobQueue {
  /**
   * Enqueues a new job.
   */
  static async enqueue(
    type: JobType,
    payload: Record<string, unknown>,
    userId: string
  ): Promise<string> {
    const col = await jobs();
    const result = await col.insertOne({
      userId,
      type,
      status: "pending",
      payload,
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return result.insertedId.toString();
  }

  /**
   * Polls for the next pending job of a given type.
   * Atomically updates status to "processing".
   */
  static async poll(type: JobType): Promise<Job | null> {
    const col = await jobs();
    // atomic find-and-update to prevent race conditions
    const result = await col.findOneAndUpdate(
      { type, status: "pending" },
      {
        $set: {
          status: "processing",
          processedAt: new Date(),
          updatedAt: new Date(),
        },
        $inc: { attempts: 1 },
      },
      { sort: { createdAt: 1 }, returnDocument: "after" }
    );

    return result ? (result as unknown as Job) : null;
  }

  /**
   * Marks a job as completed.
   */
  static async complete(jobId: string, result: Record<string, unknown> = {}) {
    const col = await jobs();
    await col.updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          status: "completed",
          result,
          updatedAt: new Date(),
        },
      }
    );
  }

  /**
   * Marks a job as failed. If max attempts reached, status remains failed.
   * Otherwise, it might be retried (logic can be added here or in a separate reaper).
   */
  static async fail(jobId: string, error: string) {
    const col = await jobs();
    await col.updateOne(
      { _id: new ObjectId(jobId) },
      {
        $set: {
          status: "failed", // Could set to 'pending' if we want immediate retry, but let's stick to failed for now
          error,
          updatedAt: new Date(),
        },
      }
    );
  }
}
