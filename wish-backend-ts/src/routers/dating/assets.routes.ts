import { Router } from "express";
import { getCountriesByLanguage } from "../../services/assets.service";

const router = Router();

router.get("/countries", async (req, res, next) => {
  try {
    let lang = (req.query.lang as string) || "en";
    const list = getCountriesByLanguage(lang);

    res.status(200).send(list);
  } catch (error) {
    next(error);
  }
});

export default router;
