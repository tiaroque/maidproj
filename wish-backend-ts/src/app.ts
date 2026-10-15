import express, { NextFunction, Request, Response } from "express";
import { Server as ServerIO } from "socket.io";
import { Server, createServer } from "http";
import cookieSession from "cookie-session";
import cors from "cors";
import { connectMongo } from "./databases/db/mongo";
import routes from "./routers";
import { setSocketsConfiguration, startSocketIO } from "./sockets/socketio";
import { manageIndexes } from "./databases/db/indexes";
import cookieParser from "cookie-parser";
import config from "./endpoints.config";
import { sessionCookieName } from "./auth/session";
import { migrateBlockedToUids } from "./services/migrate-blocked-uids";
import {
  backfillCanonicalEmails,
  ensureDeviceId,
} from "./services/device-tracking.service";
// import { wipeProductionUsers } from "./services/wipe-users";
// // // import Debug from "debug";
// // // const debug = Debug("express");
import { connectRedis } from "./databases/redis/redis";

const app = express();

// app.use(function(req, res, next) {
//   req.headers['if-none-match'] = 'no-match-for-this';
//   next();
// });

// app.set('etag', false);

// // // When credentials is set to "true" the origin cant be "*"
// // // default is "*""

// Coolify's Traefik is the only proxy that adds to X-Forwarded-For; the
// frontend's /api proxy forwards the header unchanged.
app.set("trust proxy", 1);

const expiresIn = 60 * 60 * 24 * 5 * 1000;
app.use(
  cookieSession({
    name: sessionCookieName,
    keys: [config.sessionSecret],
    maxAge: expiresIn,
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: "lax",
    path: "/",
  }),
);

app.use(
  cors({
    credentials: true,
    origin: config.corsOrigins,
  }),
);

app.use(cookieParser());
app.use(ensureDeviceId);

const port = Number(process.env.PORT ?? process.env.Port ?? 3000);

const httpServer: Server = createServer(app);
const io: ServerIO = startSocketIO(httpServer);

// io.engine.use((req: Request, res: Response, next: NextFunction) => {
//   // do something
//   next(new Error("invalid"));
//   next();
// });

setSocketsConfiguration();

// EXPRESS
app.use(express.json());
app.use(routes);

// Catch Global Errors
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // console.error(err.stack)
  res.status(500).send({ error: "Global Errors catch!", message: err.message });
});

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const connectMongoWithRetry = async (attempts = 10, delayMs = 1000) => {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await connectMongo();
      console.log("Mongo Connected");
      await manageIndexes();
      return;
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      console.error(
        `Mongo connection failed (attempt ${attempt}/${attempts}): ${message}`,
      );
      if (attempt < attempts) {
        await wait(delayMs);
      }
    }
  }
  throw lastError;
};

const start = async () => {
  try {
    await connectMongoWithRetry();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Mongo connection failed: ${message}`);
    process.exit(1);
  }

  try {
    await migrateBlockedToUids();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Blocked list migration failed: ${message}`);
  }

  try {
    await backfillCanonicalEmails();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Canonical email backfill failed: ${message}`);
  }

  const redisUrl = process.env.REDIS_HOST;
  if (redisUrl) {
    try {
      await connectRedis(io, redisUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Redis connection failed: ${message}`);
      process.exit(1);
    }
  }

  // try {
  //   await wipeProductionUsers();
  // } catch (err) {
  //   const message = err instanceof Error ? err.message : String(err);
  //   console.error(`Failed to remove production users: ${message}`);
  //   process.exit(1);
  // }

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Server running on Port ${port}`);
  });
};

start();
