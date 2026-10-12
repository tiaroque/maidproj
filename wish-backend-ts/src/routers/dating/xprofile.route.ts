import { Router } from "express";
import { matchedData } from "express-validator";
import { auth } from "../../middleware/auth";
import {
  createAbout,
  createBirthdate,
  createDetails,
  createWork,
  createOffer,
  deleteOffer,
} from "../../models/dating/xprofile";
import { validateGenderExists } from "../../middleware/validate-gender";
import { validateRequest } from "../../middleware/validate-request";
import {
  aboutRules,
  birthdateRules,
  deleteOfferRules,
  detailsRules,
  offerRules,
  workRules,
} from "../../validators/xprofile.validators";

const router = Router();

// GETS
// router.get("/detailsAll", auth, async (req, res, next) => {
//   try {
//     let email = req.email!;

//     let xprofileList = await getAllDetails(email);

//     return res.status(200).send(xprofileList[0]);
//   } catch (error) {
//     next(error);
//   }
// });

// POSTS

router.post(
  "/details",
  auth,
  validateGenderExists,
  ...detailsRules,
  validateRequest,
  async (req, res, next) => {
    try {
      const details = matchedData(req, { locations: ["body"] });

      await createDetails(req.uid, details);

      return res.status(200).send({ valid: true });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/birthdate",
  auth,
  validateGenderExists,
  ...birthdateRules,
  validateRequest,
  async (req, res, next) => {
    try {
      const { birthday } = matchedData(req, { locations: ["body"] });

      await createBirthdate(req.uid, {
        birthDateStr: birthday,
        birthDate: new Date(birthday),
      });

      return res.status(200).send({ valid: true });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/work",
  auth,
  validateGenderExists,
  ...workRules,
  validateRequest,
  async (req, res, next) => {
    try {
      const work = matchedData(req, { locations: ["body"] });

      await createWork(req.uid, res.locals.userType, work);

      return res.status(200).send({ valid: true });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/about",
  auth,
  validateGenderExists,
  ...aboutRules,
  validateRequest,
  async (req, res, next) => {
    try {
      const { languages, description } = matchedData(req, {
        locations: ["body"],
      });

      await createAbout(req.uid, { languages, description });

      return res.status(200).send({ valid: true });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  "/offer",
  auth,
  validateGenderExists,
  ...offerRules,
  validateRequest,
  async (req, res, next) => {
    try {
      const { offer } = matchedData(req, { locations: ["body"] });

      await createOffer(req.uid, offer);

      return res.status(200).send({ valid: true });
    } catch (error) {
      next(error);
    }
  }
);

router.delete(
  "/offer",
  auth,
  validateGenderExists,
  ...deleteOfferRules,
  validateRequest,
  async (req, res, next) => {
    try {
      const { offer } = matchedData(req, { locations: ["query"] });

      await deleteOffer(req.uid, offer);

      return res.status(200).send({ valid: true });
    } catch (error) {
      next(error);
    }
  }
);

// // // // // // // // // // // // // // // // // // /
// // // // // // // // FILTERS // // // // // // // //
// // // // // // // // // // // // // // // // // // /

// GETS

// router.get("/group-offers", auth, async (req, res, next) => {
//   try {
//     let userType = req.query.userType as string;

//     let list = await getOffersGrouped(userType);

//     return res.status(200).send(list[0]);
//   } catch (error) {
//     next(error);
//   }
// });

// router.get("/details", auth, async (req, res, next) => {
//   try {
//         let userMeEmail = req.email;

//     let xprofileList = await getDetails(userIdGoogle);

//     return res.status(200).send(xprofileList[0]);
//   } catch (error) {
//     next(error);
//   }
// });

// router.get("/birthdate", auth, async (req, res, next) => {
//   try {
//         let userMeEmail = req.email;

//     let xprofileList = await getDetails(userIdGoogle);

//     return res.status(200).send(xprofileList[0]);
//   } catch (error) {
//     next(error);
//   }
// });

// router.get("/measurements", auth, async (req, res, next) => {
//   try {
//         let userMeEmail = req.email;

//     let xprofileList = await getMeasures(usedIdGoogle);

//     return res.status(200).send(xprofileList[0]);
//   } catch (error) {
//     next(error);
//   }
// });

// router.get("/additional", auth, async (req, res, next) => {
//   try {
//         let userMeEmail = req.email;

//     let xprofileList = await getAdditional(usedIdGoogle);

//     return res.status(200).send(xprofileList[0]);
//   } catch (error) {
//     next(error);
//   }
// });

export default router;
