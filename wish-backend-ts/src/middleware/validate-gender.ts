import { Request, Response, NextFunction } from "express";
import { getUserByUid } from "../models/user";

export const validateGenderExists = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userObj = await getUserByUid(req.uid);
    if (!userObj?.user?.userType) {
      return res.status(401).send({ error: "Please signup" });
    }
    res.locals.userType = userObj.user.userType;
    return next();
  } catch (e) {
    return res.status(500).send({ error: "Authentication Server Error." });
  }
};
