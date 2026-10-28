import { Router } from "express";
import { auth } from "../../middleware/auth";
import { validateGenderExists } from "../../middleware/validate-gender";
import { getUserByUid } from "../../models/user";
import { visitProfile } from "../../models/dating/visits";
import { notifyProfileVisited } from "../../services/push.service";

const router = Router();

const isProfileUid = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length > 0 &&
  value.length <= 128 &&
  !/\s/.test(value);

const usersAreBlocked = (
  meUid: string,
  me: { blocked?: string[] } | undefined,
  them: { uid: string; blocked?: string[] }
) =>
  (me?.blocked ?? []).includes(them.uid) ||
  (them.blocked ?? []).includes(meUid);

router.post("/", auth, validateGenderExists, async (req, res, next) => {
  try {
    const visitedUid = req.body?.visitedUid;
    if (!isProfileUid(visitedUid)) {
      return res.status(400).send({ error: "Invalid profile" });
    }
    if (visitedUid === req.uid) {
      return res.status(400).send({ error: "You cannot visit your own profile" });
    }

    const [me, them] = await Promise.all([
      getUserByUid(req.uid),
      getUserByUid(visitedUid),
    ]);

    if (!them?.user || them.user.deleted) {
      return res.status(404).send({ error: "Profile not found" });
    }
    if (usersAreBlocked(req.uid, me?.user, them.user)) {
      return res.status(403).send({ error: "Profile unavailable" });
    }

    const visit = await visitProfile(req.uid, visitedUid);
    notifyProfileVisited(req.uid, visitedUid);
    return res.status(200).send({
      visited: true,
      visitedUid,
      createdAt: visit?.createdAt ?? null,
      lastVisitedAt: visit?.lastVisitedAt ?? null,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
