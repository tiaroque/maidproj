import { Router } from "express";
import { auth } from "../../middleware/auth";
import { validateGenderExists } from "../../middleware/validate-gender";
import { getUserByUid } from "../../models/user";
import { getActivity } from "../../models/dating/activity";

const router = Router();

router.get("/", auth, validateGenderExists, async (req, res, next) => {
  try {
    const me = await getUserByUid(req.uid);
    const activity = await getActivity(req.uid, me?.user?.blocked ?? []);
    return res.status(200).send(activity);
  } catch (error) {
    next(error);
  }
});

export default router;
