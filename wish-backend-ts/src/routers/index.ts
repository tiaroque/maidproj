import { Router } from "express";
import usersRouter from "./user.routes";
import imagesRouter from "./images.routes";
import assetsRouter from "./dating/assets.routes";
import xprofileRouter from "./dating/xprofile.route";
import listRouter from "./dating/list.routes";
import likesRouter from "./dating/likes.routes";
import visitsRouter from "./dating/visits.routes";
import activityRouter from "./dating/activity.routes";
import chatRouter from "./dating/chat.routes";
import contactRouter from "./contact.routes";
import locationRouter from "./locations/location.routes";
import verificationRouter from "./verification.routes";
import mediaRouter from "./media.routes";
import moderationRouter from "./moderation.routes";
import pushRouter from "./push.routes";

const routes = Router();

// Common
routes.use("/api/users", usersRouter);

routes.use("/api/images", imagesRouter);

routes.use("/api/media", mediaRouter);

routes.use("/api/contact", contactRouter);

routes.use("/api/verification", verificationRouter);

routes.use("/api/moderation", moderationRouter);

routes.use("/api/push", pushRouter);

// Dating
routes.use("/api/assets", assetsRouter);

routes.use("/api/xprofile", xprofileRouter);

routes.use("/api/list", listRouter);

routes.use("/api/likes", likesRouter);

routes.use("/api/visits", visitsRouter);

routes.use("/api/activity", activityRouter);

routes.use("/api/chat", chatRouter);

routes.use("/api/locations", locationRouter);

routes.use((req, res, next) => {
  // const error = new Error("Not found");
  // next(error)
  res.status(404).send({
    status: 404,
    error: "Route Not found",
  });
});

export default routes;
