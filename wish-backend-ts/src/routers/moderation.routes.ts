import { Router } from "express";
import { matchedData } from "express-validator";
import { auth } from "../middleware/auth";
import { isModerator, requireModerator } from "../middleware/require-moderator";
import { validateRequest } from "../middleware/validate-request";
import { deleteAllPasskeys } from "../models/passkey";
import { getUserByUid, markUserRemovedByModerator } from "../models/user";
import {
  ClusterSignal,
  dismissCluster,
  findLinkedAccounts,
  findMultiAccountClusters,
} from "../services/device-tracking.service";
import {
  dismissLinkFlags,
  findLinkFlags,
} from "../services/link-detection.service";
import {
  dismissClusterRules,
  dismissLinkFlagsRules,
  listClustersRules,
  removeAccountRules,
} from "../validators/moderation.validators";

const moderationRouter = Router();
moderationRouter.use(auth, requireModerator);

moderationRouter.get(
  "/multi-accounts",
  ...listClustersRules,
  validateRequest,
  async (req, res, next) => {
    const signal: ClusterSignal =
      req.query.signal === "fingerprint" ? "fingerprint" : "device";
    try {
      res.status(200).send(await findMultiAccountClusters(signal));
    } catch (error) {
      next(error);
    }
  }
);

moderationRouter.post(
  "/multi-accounts/dismiss",
  ...dismissClusterRules,
  validateRequest,
  async (req, res, next) => {
    try {
      const { signal, key, uids } = matchedData(req, { locations: ["body"] });
      await dismissCluster(signal, key, uids, req.email);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

moderationRouter.get("/link-flags", async (_req, res, next) => {
  try {
    res.status(200).send(await findLinkFlags());
  } catch (error) {
    next(error);
  }
});

moderationRouter.post(
  "/link-flags/:uid/dismiss",
  ...dismissLinkFlagsRules,
  validateRequest,
  async (req, res, next) => {
    try {
      const { uid } = matchedData(req, { locations: ["params"] });
      await dismissLinkFlags(uid, req.email);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

moderationRouter.get("/users/:uid/linked-accounts", async (req, res, next) => {
  try {
    res.status(200).send(await findLinkedAccounts(req.params.uid));
  } catch (error) {
    next(error);
  }
});

moderationRouter.post(
  "/users/:uid/remove",
  ...removeAccountRules,
  validateRequest,
  async (req, res, next) => {
    try {
      const { uid } = matchedData(req, { locations: ["params"] });
      const { reason } = matchedData(req, { locations: ["body"] });
      const target = (await getUserByUid(uid))?.user;
      if (!target) {
        return res.status(404).send({ error: "User not found" });
      }
      if (uid === req.uid || isModerator(target.email)) {
        return res.status(409).send({ error: "CANNOT_REMOVE_MODERATOR" });
      }
      if (!(await markUserRemovedByModerator(uid, req.email, reason))) {
        return res.status(409).send({ error: "ALREADY_REMOVED" });
      }
      await deleteAllPasskeys(uid);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

export default moderationRouter;
