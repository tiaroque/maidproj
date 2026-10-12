import { Request, Response, NextFunction } from "express";

export const auth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const session = req.session;
    if (!session?.uid || !session.email) {
      return res.status(401).send({ error: "Please authenticate." });
    }

    req.uid = session.uid;
    req.name = session.name;
    req.email = session.email;

    return next();
  } catch (e) {
    return res.status(500).send({ error: "Authentication Server Error." });
  }
};
