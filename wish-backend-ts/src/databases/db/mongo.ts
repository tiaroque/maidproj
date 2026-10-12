import { Db, MongoClient } from "mongodb";
import config from "../../endpoints.config";

let client: MongoClient;
let db: Db;

export const connectMongo = async () => {
  client = new MongoClient(config.mongoUrl);

  try {
    const mongoClient = await client.connect();
    db = mongoClient.db(config.mongoDb);
    return db;
  } catch (err) {
    try {
      await client.close();
    } catch {
      // ignore close errors after a failed connect
    }
    throw err;
  }
};

export const getDb = () => {
  if (!db) {
    throw new Error("MongoDB is not connected");
  }
  return db;
};

export const close = () => {
  return client?.close();
};
