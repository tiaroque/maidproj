import { Router } from "express";
import { auth } from "../middleware/auth";
import config from "../endpoints.config";
import {
  deletePushSubscription,
  savePushSubscription,
} from "../models/push-subscription";
import { getPushPrefs, PushKind, setPushPrefs } from "../models/user";
import { isPushConfigured } from "../services/push.service";

const router = Router();

const pushKinds: PushKind[] = ["chat", "likes", "visits"];

const isBoundedString = (value: unknown, max: number): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= max;

const isEndpoint = (value: unknown): value is string => {
  if (!isBoundedString(value, 2048)) {
    return false;
  }
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
};

router.get("/vapid-public-key", (_req, res) => {
  if (!isPushConfigured()) {
    return res.status(503).send({ error: "Push notifications are disabled" });
  }
  res.status(200).send({ publicKey: config.vapidPublicKey });
});

router.post("/subscribe", auth, async (req, res, next) => {
  try {
    const endpoint = req.body?.endpoint;
    const p256dh = req.body?.keys?.p256dh;
    const authKey = req.body?.keys?.auth;
    if (
      !isEndpoint(endpoint) ||
      !isBoundedString(p256dh, 256) ||
      !isBoundedString(authKey, 256)
    ) {
      return res.status(400).send({ error: "Invalid subscription" });
    }

    const userAgent = String(req.headers["user-agent"] ?? "").slice(0, 512);
    await savePushSubscription(
      req.uid,
      endpoint,
      { p256dh, auth: authKey },
      userAgent
    );
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.post("/unsubscribe", auth, async (req, res, next) => {
  try {
    const endpoint = req.body?.endpoint;
    if (!isEndpoint(endpoint)) {
      return res.status(400).send({ error: "Invalid subscription" });
    }
    await deletePushSubscription(req.uid, endpoint);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

router.get("/prefs", auth, async (req, res, next) => {
  try {
    res.status(200).send(await getPushPrefs(req.uid));
  } catch (error) {
    next(error);
  }
});

router.put("/prefs", auth, async (req, res, next) => {
  try {
    const prefs = Object.fromEntries(
      pushKinds
        .filter((kind) => typeof req.body?.[kind] === "boolean")
        .map((kind) => [kind, req.body[kind] as boolean])
    );
    if (Object.keys(prefs).length === 0) {
      return res.status(400).send({ error: "Invalid preferences" });
    }
    if (!(await setPushPrefs(req.uid, prefs))) {
      return res.status(404).send({ error: "User not found" });
    }
    res.status(200).send(await getPushPrefs(req.uid));
  } catch (error) {
    next(error);
  }
});

export default router;
