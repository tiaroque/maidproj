import { Router } from "express";

import { auth } from "../middleware/auth";
import { isChatMediaParticipant } from "../models/dating/chat";
import { mediaRedirectMaxAge, signedMediaUrl } from "../services/media-url";

const PROFILE_PREFIXES = new Set(["pictures", "pictures-resized"]);
const CHAT_PREFIXES = new Set(["chat", "chat-resized"]);

const mediaRouter = Router();

// GET /api/media/<prefix>/<owner>/<file>
mediaRouter.get("/*", auth, async (req, res, next) => {
  const key = (req.params as Record<string, string>)[0] ?? "";
  const segments = key.split("/");
  const [prefix, owner] = segments;

  const wellFormed =
    segments.length === 3 &&
    segments.every((segment) => segment && segment !== "." && segment !== "..");
  const isProfile = PROFILE_PREFIXES.has(prefix);
  const isChat = CHAT_PREFIXES.has(prefix);

  if (!wellFormed || (!isProfile && !isChat)) {
    return res.status(404).send();
  }

  try {
    if (isChat) {
      if (owner !== req.uid && !(await isChatMediaParticipant(key, req.uid!))) {
        return res.status(404).send();
      }
    }

    const url = await signedMediaUrl(key);
    res.set("Cache-Control", `private, max-age=${mediaRedirectMaxAge()}`);
    res.redirect(302, url);
  } catch (error) {
    next(error);
  }
});

export default mediaRouter;
