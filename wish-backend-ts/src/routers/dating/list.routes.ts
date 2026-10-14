import { Router } from "express";
import { auth } from "../../middleware/auth";
import {
  getLastestUsers,
  getLastestUsersBlured,
  getLatestOffersBlured,
  getSitemapProfiles,
  getList,
  GlobalFilters,
  GlobalQuickFilters,
} from "../../models/dating/list";
import { validateGenderExists } from "../../middleware/validate-gender";
import { getAllOnlineUserIds } from "../../sockets/socketio";
import { isUserType, SERVICES } from "../../models/dating/service-catalog";

const router = Router();

router.get("", auth, validateGenderExists, async (req, res, next) => {
  try {
    let userMeId = req.uid;

    if (!isUserType(req.query.type)) {
      return res.status(400).send({ error: "type must be Cleaner or Client" });
    }
    const userType = req.query.type;
    const pageNumber: number = +(req.query.pageNumber || 1);
    const pageSize: number = +(req.query.pageSize || 10);

    const queryList = (key: string) =>
      (req.query[key] as string | undefined)?.split(",").filter(Boolean);

    const searchTerms = req.query.searchTerms as string;

    const globalFilters: GlobalFilters = {
      location: req.query.location as string,
      country: req.query.country as string,
      languages: queryList("languages") ?? [],
      services: queryList("services") ?? [],
      days: queryList("days") ?? [],
      slots: queryList("slots") ?? [],
      rate: queryList("rate") ?? [],
      onlineOnly: req.query.online === "true",
      verifiedOnly: req.query.verified === "true",
      openToRelocateOnly: req.query.openToRelocate === "true",
    };

    const onlineUserIds = await getAllOnlineUserIds();

    let list = await getList(
      userMeId,
      "asc",
      pageNumber,
      pageSize,
      userType,
      searchTerms,
      globalFilters,
      onlineUserIds
    );

    const pagingObj = {
      metadata: { ...list[0].metadata[0], pageNumber, pageSize },
      data: list[0].data,
    };

    return res.status(200).send(pagingObj);
  } catch (error) {
    next(error);
  }
});

router.get(
  "/latestUsers",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    try {
      let userMeId = req.uid;

      if (!isUserType(req.query.type)) {
        return res.status(400).send({ error: "type must be Cleaner or Client" });
      }

      let list = await getLastestUsers(userMeId, req.query.type);

      return res.status(200).send(list);
    } catch (error) {
      next(error);
    }
  }
);

router.get("/browse", async (req, res, next) => {
  try {
    const type = req.query.type;
    const service = req.query.service as string | undefined;

    const globalFilters: GlobalQuickFilters = {
      userType: isUserType(type) ? type : "",
      location: req.query.location as string,
      country: req.query.country as string,
      service: SERVICES.includes(service as any) ? service! : "",
    };

    let list = await getLastestUsersBlured(globalFilters);

    return res.status(200).send(list);
  } catch (error) {
    next(error);
  }
});

router.get("/latestOffers", async (_req, res, next) => {
  try {
    const list = await getLatestOffersBlured();
    return res.status(200).send(list);
  } catch (error) {
    next(error);
  }
});

router.get("/sitemap-profiles", async (_req, res, next) => {
  try {
    const profiles = await getSitemapProfiles();
    return res.status(200).send(profiles);
  } catch (error) {
    next(error);
  }
});

export default router;
