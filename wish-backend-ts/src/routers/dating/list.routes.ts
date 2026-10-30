import { Router } from "express";
import geoip from "geoip-lite";
import { auth } from "../../middleware/auth";
import {
  getLastestUsers,
  getLastestUsersBlured,
  getLatestOffersBlured,
  getSitemapProfiles,
  getSitemapLocations,
  getList,
  GlobalFilters,
  GlobalQuickFilters,
} from "../../models/dating/list";
import { countRegisteredUsers } from "../../models/user";
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

// Mirrors BROWSE_COUNTRIES in the frontend's src/app/utils/browse-locations.ts.
const browseCountries = new Set(["PT", "DE", "FR", "ES", "IT", "CH", "NL", "GB", "US"]);

const visitorCountry = (ip: string | undefined) => {
  const country = ip ? geoip.lookup(ip)?.country : undefined;
  return country && browseCountries.has(country) ? country : "";
};

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

    // `nearby` narrows to the visitor's country only when we serve it and it
    // has members; otherwise the list stays worldwide rather than empty.
    const nearbyCountry =
      req.query.nearby === "true" && !globalFilters.country
        ? visitorCountry(req.ip)
        : "";

    let list = nearbyCountry
      ? await getLastestUsersBlured({ ...globalFilters, country: nearbyCountry })
      : [];
    if (!list.length) {
      list = await getLastestUsersBlured(globalFilters);
    }

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

// Every anonymous home page view hits this, so the count is reused for a while
// instead of scanning the users collection per request.
const membersCountTtlMs = 10 * 60 * 1000;
let membersCountCache: { count: number; expiresAt: number } | null = null;
const membersCountViewers = ["tiaroque@gmail.com"];

router.get("/members-count", async (req, res, next) => {
  try {
    const email = req.session?.email?.toLowerCase();
    if (!email || !membersCountViewers.includes(email)) {
      return res.status(200).send({ count: null });
    }

    if (!membersCountCache || membersCountCache.expiresAt <= Date.now()) {
      membersCountCache = {
        count: await countRegisteredUsers(),
        expiresAt: Date.now() + membersCountTtlMs,
      };
    }
    return res.status(200).send({ count: membersCountCache.count });
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

router.get("/sitemap-locations", async (_req, res, next) => {
  try {
    const locations = await getSitemapLocations();
    return res.status(200).send(locations);
  } catch (error) {
    next(error);
  }
});

export default router;
