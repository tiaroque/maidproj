import { body, param } from "express-validator";

export const verificationIdRules = [
  param("id").isMongoId().withMessage("id must be a valid id"),
];

export const rejectRules = [
  ...verificationIdRules,
  body("reason")
    .isString()
    .withMessage("reason must be a string")
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage("reason must be 1 to 200 characters"),
];
