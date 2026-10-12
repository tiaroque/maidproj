import { once } from "events";
import ioredis, { Redis } from "ioredis";
import { Server as ServerIO } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";

let redisConnection: Redis;

export const connectRedis = async (io: ServerIO, redisUrl: string) => {
  redisConnection = new ioredis(redisUrl);
  const subClient = redisConnection.duplicate();

  for (const client of [redisConnection, subClient]) {
    client.on("error", (error) => {
      console.error("Redis connection error", error.message);
    });
  }

  await Promise.all([once(redisConnection, "ready"), once(subClient, "ready")]);

  io.adapter(createAdapter(redisConnection, subClient));
  console.log(
    `The connection to Redis was correctly stablished - ${redisConnection.options.host}:${redisConnection.options.port}`,
  );
};

export const getRedisConnection = () => redisConnection;
