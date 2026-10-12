import { Router } from "express";

import config from "../endpoints.config";
import { auth } from "../middleware/auth";
import path from "path";
import {
  // countUserImages,
  // deleteImage,
  deleteImageUserProfile,
  // getFirstImage,
  // getImageById,
  // getUserImages,
  // saveUserImage,
  // setProfilePic,
  setAvatarUserProfile,
  setProfilePicUserProfile,
  updateUserProfileImages,
} from "../models/images";
import { deleteObject, s3Client, uploads3 } from "../services/file-upload";
import { ImageInfo } from "../interfaces/main-interfaces";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v1 } from "uuid";
import sharp from "sharp";
import { deleteMessage } from "../models/dating/chat";
import { validateGenderExists } from "../middleware/validate-gender";
import { publicBlurredKey } from "../services/public-photo-key";
import { revokeIfPhotoChanged } from "../models/verification";

const imagesRouter = Router();

imagesRouter.delete(
  "/image/:key",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    const keyFull = req.params.key; // pictures/<uid>/<imageId>.jpg
    const [prefix, owner, keyAndExtensionStr, ...rest] = keyFull.split("/");

    if (prefix !== "pictures" || !keyAndExtensionStr || rest.length || owner !== req.uid) {
      return res.status(403).send({ error: "Forbidden" });
    }

    const imgKey = `${owner}/${keyAndExtensionStr}`;
    const dot = keyAndExtensionStr.lastIndexOf(".");
    const imageId =
      dot === -1 ? keyAndExtensionStr : keyAndExtensionStr.slice(0, dot);
    const extension = dot === -1 ? "" : keyAndExtensionStr.slice(dot);

    const resizedKey = `pictures-resized/${imgKey}`;
    const bluredKey = publicBlurredKey(req.uid, imageId, extension);

    try {
      // let image = await getImageById(key);
      // let isProfilePic = image.isProfile;

      await deleteObject(config.AWSBucketName, [
        { Key: keyFull },
        { Key: resizedKey },
        { Key: bluredKey },
      ]);

      // let result = await deleteImage(key);
      let result2 = await deleteImageUserProfile(req.uid, keyFull);
      await revokeIfPhotoChanged(req.uid);

      // //get first image and set it as the profile picture
      // let firstImage = await getFirstImage(usedIdGoogle);
      // if (firstImage && isProfilePic) {
      //   // let images = await setProfilePic(usedIdGoogle, firstImage._id);
      //   let images2 = await setProfilePicUserProfile(userEmail, key);
      // }

      res.status(200).send();
    } catch (e) {
      next(e);
    }
  }
);

// // get photos of user
// imagesRouter.get("/files", auth, async (req, res, next) => {
//   let usedIdGoogle = req.email;

//   try {
//     let images = await getUserImages(usedIdGoogle);
//     res.status(200).send(images);
//   } catch (e) {
//     next(e);
//   }
// });

imagesRouter.post(
  "/setProfilePic",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    let photoId = req.body.photoId;
    let key = req.body.key;

    try {
      // let images = await setProfilePic(usedIdGoogle, photoId);
      let images2 = await setProfilePicUserProfile(req.uid, key);
      await revokeIfPhotoChanged(req.uid);
      res.status(200).send(images2);
    } catch (e) {
      next(e);
    }
  }
);

const avatarPattern = /^(female|male)-(0[1-9]|1\d|20)$/;

imagesRouter.post(
  "/setAvatar",
  auth,
  validateGenderExists,
  async (req, res, next) => {
    const avatar = req.body.avatar;
    if (typeof avatar !== "string" || !avatarPattern.test(avatar)) {
      return res.status(400).send({ error: "Invalid avatar" });
    }

    try {
      await setAvatarUserProfile(req.uid, avatar);
      await revokeIfPhotoChanged(req.uid);
      res.status(200).send();
    } catch (e) {
      next(e);
    }
  }
);

imagesRouter.post(
  "/upload",
  auth,
  validateGenderExists,
  uploads3.single("file"),
  async (req, res, next) => {
    let file = req.file as Express.Multer.File;
    let usedIdGoogle = req.uid;
    let width = +req.body.width;
    let height = +req.body.height;

    let extension = path.extname(file.originalname);
    const imageId = v1();
    const key = `${req.uid}/${imageId}${extension}`;
    const bluredKey = publicBlurredKey(req.uid, imageId, extension);

    // let hashedKey = hashSync(key, 3);
    // hashedKey = hashedKey.replace(/\//g, "");

    // const encrypted_key = encodeURIComponent(encrypt(uid));
    // const decrypted_key = decrypt(encrypted_key);

    try {
      const thumbnail = await sharp(file.buffer).resize(300).toBuffer();
      const thumbBlured = await sharp(file.buffer)
        .resize(300)
        .blur(16)
        .toBuffer();

      const paramsImage = {
        Bucket: config.AWSBucketName,
        Key: "pictures/" + key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      const paramsThumbnail = {
        Bucket: config.AWSBucketName,
        Key: "pictures-resized/" + key,
        Body: thumbnail,
        ContentType: file.mimetype,
      };

      const paramsThumbBlured = {
        Bucket: config.AWSBucketName,
        Key: bluredKey,
        Body: thumbBlured,
        ContentType: file.mimetype,
      };

      const s3Object = await s3Client.send(new PutObjectCommand(paramsImage));
      const s3ObjectThumbnail = await s3Client.send(
        new PutObjectCommand(paramsThumbnail)
      );
      const s3ObjectBlured = await s3Client.send(
        new PutObjectCommand(paramsThumbBlured)
      );

      // Everything went fine.
      let imageObj: ImageInfo = {
        userId: usedIdGoogle,
        bucket: paramsImage.Bucket,
        key: paramsImage.Key,
        keyRezised: paramsThumbnail.Key,
        keyBlured: paramsThumbBlured.Key,
        mimetype: file.mimetype,
        contentType: "image",
        originalname: file.originalname,
        size: file.size,
        isProfile: false,
        height: height,
        width: width,
        thumbWidth: 300,
        thumbHeight: Math.round((height / width) * 300),
      };

      let updatedUser = await updateUserProfileImages(req.uid, imageObj);

      res.status(201).send({
        imageObj,
      });
    } catch (error) {
      console.error(error);
      next(error);
    }
  }
);

imagesRouter.post(
  "/uploadChatImages",
  auth,
  uploads3.single("file"),
  async (req, res, next) => {
    let file = req.file as Express.Multer.File;

    let conversationId = req.body.conversationId as string;
    let messageId = req.body.messageId as string;
    let width = +req.body.width;
    let height = +req.body.height;

    let extension = path.extname(file.originalname);
    const key = `${req.uid}/${v1()}${extension}`;

    try {
      const thumbnail = await sharp(file.buffer).resize(300).toBuffer();

      const paramsImage = {
        Bucket: config.AWSBucketName,
        Key: "chat/" + key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      const paramsThumbnail = {
        Bucket: config.AWSBucketName,
        Key: "chat-resized/" + key,
        Body: thumbnail,
        ContentType: file.mimetype,
      };

      const s3Object = await s3Client.send(new PutObjectCommand(paramsImage));
      const s3ObjectThumbnail = await s3Client.send(
        new PutObjectCommand(paramsThumbnail)
      );
      let imageObj: ImageInfo = {
        key: paramsImage.Key,
        keyRezised: paramsThumbnail.Key,
        mimetype: file.mimetype,
        height: height,
        width: width,
        thumbWidth: 300,
        thumbHeight: Math.round((height / width) * 300),
      };

      res.status(201).send({
        imageObj,
      });
    } catch (error) {
      console.error(error);
      await deleteMessage(messageId);
      next(error);
    }
  }
);

// // // // // // // Uploads user photos gallery // // // // // // // // //

// imagesRouter.post("/uploadChatImages", auth, async (req, res, next) => {
//   uploads3Chat.single("file")(req, res, async (err) => {
//     let conversationId = req.body.conversationId as string;
//     let messageId = req.body.messageId as string;
//     let width = +req.body.width;
//     let height = +req.body.height;
//     try {
//       if (err instanceof MulterError) {
//         await deleteMessage(messageId);
//         return res.status(400).json({ errors: err.message });
//       } else if (err) {
//         await deleteMessage(messageId);
//         return res
//           .status(500)
//           .json({ errors: "General Error uploading image" });
//       }

//       // Everything went fine.

//       let image = req.file as any;

//       if (!conversationId) {
//         return res.status(400).json({ errors: "conversationId not supplied" });
//       }

//       let imageObj: ImageInfo = {
//         key: image.key,
//         location: image.location,
//         mimetype: image.mimetype,
//         height: height,
//         width: width,
//         // userId: usedIdGoogle,
//         // bucket: image.bucket,
//         // contentType: image.contentType,
//         // originalname: image.originalname,
//         // size: image.size,
//         // date: new Date()
//       };

//       // let messageDto: ChatMessageDTO = {
//       //   conversationId: conversationId,
//       //   sender: usedIdGoogle,
//       //   image: imageObj,
//       //   date: new Date().toISOString()
//       // };

//       res.status(201).send({
//         imageObj,
//       });
//     } catch (e) {
//       next(e);
//     }
//   });
// });

// // upload.array('images', 5)
// imagesRouter.post("/upload", auth, async (req, res, next) => {
//   uploads3.single("file")(req, res, async (err) => {
//     let image = req.file as any;
//     let usedIdGoogle = req.uid;
//     let userEmail = req.email;
//     let width = +req.body.width;
//     let height = +req.body.height;

//     // return res.status(500).json({ errors: "General Error uploading image" });
//     try {
//       if (err instanceof MulterError) {
//         return res.status(400).json({ errors: err.message });
//       } else if (err) {
//         return res
//           .status(500)
//           .json({ errors: "General Error uploading image" });
//       }

//       // Everything went fine.
//       let imageObj: ImageInfo = {
//         userId: usedIdGoogle,
//         bucket: image.bucket,
//         key: image.key,
//         location: image.location,
//         mimetype: image.mimetype,
//         contentType: image.contentType,
//         originalname: image.originalname,
//         size: image.size,
//         isProfile: false,
//         etag: image.etag,
//         height: height,
//         width: width,
//       };

//       // let countImages = await countUserImages(userEmail);

//       // if (countImages === 0) {
//       //   imageObj.isProfile = true;
//       // }

//       // let imageDbId = await saveUserImage(imageObj);
//       let updatedUser = await updateUserProfileImages(userEmail!, imageObj);

//       // imageObj._id = imageDbId.toHexString();

//       res.status(201).send({
//         imageObj,
//       });
//     } catch (e) {
//       next(e);
//     }
//   });
// });

// usersRouter.get('/fileCount', auth, async (req, res) => {
//   let user = req.user;
//   let usedIdGoogle = user.uid;

//   try {
//     let count = await countUserImages(usedIdGoogle);
//     res.status(200).send(count);
//   } catch (e) {
//     res.status(400).send(e.message)
//   }
// })

// usersRouter.get('/simple-upload', async (req, res) => {
//   let images = req.files;

//   getSignedUrl('1232312')
//     .then(url => {
//       res.send({ url })
//     })
//     .catch(e => {
//       res.status(500).send();
//     });

//   console.log(images);
// })

export default imagesRouter;
