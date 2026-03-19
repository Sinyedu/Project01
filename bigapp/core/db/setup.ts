import { getDb } from "./client";

/**
 * Creates indexes for all collections.
 * Run once: npx tsx core/db/setup.ts
 */
export async function setupIndexes() {
  const db = await getDb();

  await db.collection("archives").createIndexes([
    { key: { userId: 1, createdAt: -1 } },
    { key: { platform: 1, status: 1 } },
    { key: { tags: 1 } },
    { key: { sourceAlive: 1, lastVerifiedAt: 1 } },
    { key: { contentHash: 1 }, unique: true, sparse: true },
  ]);

  await db.collection("capture_jobs").createIndexes([
    { key: { enabled: 1, nextRunAt: 1 } },
    { key: { userId: 1 } },
  ]);

  await db.collection("time_capsules").createIndexes([
    { key: { status: 1, lockedUntil: 1 } },
    { key: { userId: 1 } },
  ]);

  await db.collection("connections").createIndexes([
    { key: { userId: 1, source: 1 } },
    { key: { status: 1 } },
  ]);

  await db.collection("snapshots").createIndexes([
    { key: { connectionId: 1, startedAt: -1 } },
    { key: { phase: 1 } },
    { key: { userId: 1 } },
  ]);

  await db.collection("records").createIndexes([
    { key: { userId: 1, source: 1, kind: 1 } },
    { key: { snapshotId: 1 } },
    { key: { connectionId: 1 } },
    { key: { sourceId: 1, source: 1 }, unique: true, sparse: true },
    { key: { sourceTimestamp: -1 } },
    { key: { checksum: 1 } },
  ]);

  /**
   * NOTE: Atlas Vector Search index must be created via Atlas UI or API.
   * Name: vector_index
   * Definition:
   * {
   *   "mappings": {
   *     "dynamic": true,
   *     "fields": {
   *       "embedding": {
   *         "type": "knnVector",
   *         "dimensions": 768,
   *         "similarity": "cosine"
   *       }
   *     }
   *   }
   * }
   */
  console.log("Indexes created.");
}

if (require.main === module) {
  require("dotenv").config();
  setupIndexes()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
