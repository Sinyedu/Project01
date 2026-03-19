import { MongoClient, Db } from "mongodb";

if (!process.env.MONGO_URI) {
  throw new Error("MONGO_URI is not defined in environment variables");
}

const client = new MongoClient(process.env.MONGO_URI);

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

const clientPromise =
  global._mongoClientPromise ?? (global._mongoClientPromise = client.connect());

export default clientPromise;

export async function getDb(name = "bigapp"): Promise<Db> {
  return (await clientPromise).db(name);
}
