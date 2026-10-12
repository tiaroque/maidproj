import { Router } from "express";
import { saveMessage } from "../models/contact";

const router = Router();

router.post("/saveMessage", async (req, res, next) => {
  try {
    const userMeId = req.uid;
    const email =
      typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
    const name = req.body.name;
    const message = req.body.message;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).send({ title: "A valid email is required" });
      return;
    }

    await saveMessage(userMeId, email, name, message);
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

export default router;
