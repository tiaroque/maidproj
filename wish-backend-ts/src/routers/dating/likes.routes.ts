import { Router } from "express";
import { auth } from "../../middleware/auth";
import { validateGenderExists } from "../../middleware/validate-gender";
import { getUserByUid } from "../../models/user";
import { likeProfile, unlikeProfile } from "../../models/dating/likes";
import { notifyLikeByEmail } from "../../services/activity-email.service";
import { notifyProfileLiked } from "../../services/push.service";

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
    const likedUid = req.body?.likedUid;
    if (!isProfileUid(likedUid)) {
      return res.status(400).send({ error: "Invalid profile" });
    }
    if (likedUid === req.uid) {
      return res.status(400).send({ error: "You cannot like your own profile" });
    }

    const [me, them] = await Promise.all([
      getUserByUid(req.uid),
      getUserByUid(likedUid),
    ]);

    if (!them?.user || them.user.deleted) {
      return res.status(404).send({ error: "Profile not found" });
    }
    if (usersAreBlocked(req.uid, me?.user, them.user)) {
      return res.status(403).send({ error: "Profile unavailable" });
    }

    const { like, isNew } = await likeProfile(req.uid, likedUid);
    if (isNew) {
      notifyProfileLiked(req.uid, likedUid);
      notifyLikeByEmail(req.uid, likedUid);
    }
    return res.status(200).send({
      liked: true,
      likedUid,
      createdAt: like?.createdAt ?? null,
    });
  } catch (error) {
    next(error);
  }
});

router.delete(
  "/:likedUid",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      const likedUid = req.params.likedUid;
      if (!isProfileUid(likedUid)) {
        return res.status(400).send({ error: "Invalid profile" });
      }

      await unlikeProfile(req.uid, likedUid);
      return res.status(200).send({
        liked: false,
        likedUid,
        createdAt: null,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
