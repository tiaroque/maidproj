import { Router } from "express";
import { searchLocation } from "../../models/locations/locations-search";

const router = Router();

const meridianLanguages = new Set(["pt", "de", "fr", "es", "it", "ch", "nl", "uk"]);

router.get("/search", async (req, res) => {
  try {
    const language = String(req.query.lang ?? "").toLowerCase();
    const searchString = String(req.query.q ?? "").trim();
    const requestedLimit = Number(req.query.limit ?? 10);
    const limit = Math.min(Math.max(requestedLimit || 10, 1), 100);

    if (searchString.length < 2) {
      return res
        .status(400)
        .send({ error: "q must be at least 2 characters long" });
    }

    if (!meridianLanguages.has(language)) {
      return res.status(400).send({ error: "unsupported country" });
    }

    const result = await searchLocation(language, searchString, limit);

    return res.status(200).send(result);
  } catch (error: any) {
    return res.status(502).send({ error: error.message });
  }
});

export default router;
