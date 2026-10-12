import { body, query } from "express-validator";
import {
  DAYS,
  MAX_AREAS,
  MAX_RATE,
  MIN_RATE,
  SERVICES,
  SLOTS,
} from "../models/dating/service-catalog";

const MIN_AGE = 18;
const MAX_AGE = 120;

// Limits mirror the frontend schema in maid/src/app/forms/profile-form.ts.
const optionalText = (field: string, max: number) =>
  body(field)
    .optional()
    .isString()
    .withMessage(`${field} must be a string`)
    .trim()
    .isLength({ max })
    .withMessage(`${field} must be at most ${max} characters`);

const ageInYears = (birthDate: Date, now = new Date()) => {
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const beforeBirthday =
    now.getUTCMonth() < birthDate.getUTCMonth() ||
    (now.getUTCMonth() === birthDate.getUTCMonth() &&
      now.getUTCDate() < birthDate.getUTCDate());
  return beforeBirthday ? age - 1 : age;
};

const optionalEnumList = (field: string, allowed: readonly string[]) => [
  body(field)
    .optional()
    .isArray({ max: allowed.length })
    .withMessage(`${field} must be a list of at most ${allowed.length} items`),
  body(`${field}.*`)
    .isIn(allowed)
    .withMessage(`${field} contains an unknown value`),
];

export const detailsRules = [
  optionalText("profileName", 35),
  optionalText("country", 80),
  optionalText("location", 80),
  optionalText("locationName", 200),
  body("experienceYears")
    .optional()
    .isInt({ min: 0, max: 60 })
    .withMessage("experienceYears must be between 0 and 60")
    .toInt(),
];

export const birthdateRules = [
  body("birthday")
    .exists({ values: "falsy" })
    .withMessage("birthday is required")
    .bail()
    .isISO8601({ strict: true })
    .withMessage("birthday must be an ISO 8601 date")
    .bail()
    .custom((value: string) => {
      const age = ageInYears(new Date(value));
      if (age < MIN_AGE) {
        throw new Error(`You must be at least ${MIN_AGE} years old`);
      }
      if (age > MAX_AGE) {
        throw new Error("birthday is not valid");
      }
      return true;
    }),
];

export const workRules = [
  ...optionalEnumList("services", SERVICES),
  body("hourlyRate")
    .optional()
    .isFloat({ min: MIN_RATE, max: MAX_RATE })
    .withMessage(`hourlyRate must be between ${MIN_RATE} and ${MAX_RATE}`)
    .toFloat(),
  ...optionalEnumList("availability.days", DAYS),
  ...optionalEnumList("availability.slots", SLOTS),
  body("areasCovered")
    .optional()
    .isArray({ max: MAX_AREAS })
    .withMessage(`areasCovered must be a list of at most ${MAX_AREAS} areas`),
  body("areasCovered.*.country")
    .isString()
    .trim()
    .isLength({ min: 2, max: 80 })
    .withMessage("each area needs a country"),
  body("areasCovered.*.location")
    .isString()
    .trim()
    .isLength({ min: 1, max: 80 })
    .matches(/^\//)
    .withMessage("each area needs a location from the search"),
  body("areasCovered.*.locationName")
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("each area needs a name"),
];

export const aboutRules = [
  body("languages")
    .optional()
    .isArray({ max: 20 })
    .withMessage("languages must be a list of at most 20 items"),
  body("languages.*")
    .isString()
    .trim()
    .isLength({ min: 1, max: 40 })
    .withMessage("each language must be 1 to 40 characters"),
  optionalText("description", 500),
];

export const offerRules = [
  body("offer")
    .isString()
    .withMessage("offer must be a string")
    .trim()
    .isLength({ min: 1, max: 80 })
    .withMessage("offer must be 1 to 80 characters"),
];

export const deleteOfferRules = [
  query("offer")
    .isString()
    .withMessage("offer is required")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("offer is required"),
];
