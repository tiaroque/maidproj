import { getDb } from "../databases/db/mongo";
import { UpdateResult } from "mongodb";
import { ImageInfo } from "../interfaces/main-interfaces";

// Gets the first image of the user to set it as the profile picture,
// happens after deleting the currently selected profile pic
// export const getFirstImage = async (userId: string) => {
//   let collection = getDb().collection("images");
//   return collection.findOne({ userId });
// };

// Adds image to the images db table
// export const saveUserImage = async (
//   imageInfo: ImageInfo
// ): Promise<ObjectID> => {
//   let collection = getDb().collection("images");
//   const result = await collection.insertOne(imageInfo);
//   return result.insertedId;
// };

// Adds images to user db table
export const updateUserProfileImages = async (
  uid: string,
  imageInfo: ImageInfo
): Promise<UpdateResult> => {
  let collection = getDb().collection("users");

  const query = {
    uid,
  };

  let updateDate = new Date(new Date().toISOString());

  const update = {
    $set: {
      updateDate,
    },
    $addToSet: {
      images: {
        key: imageInfo.key,
        keyRezised: imageInfo.keyRezised,
        keyBlured: imageInfo.keyBlured,
        isProfile: imageInfo.isProfile,
        width: imageInfo.width,
        height: imageInfo.height,
        thumbWidth: imageInfo.thumbWidth,
        thumbHeight: imageInfo.thumbHeight,
      },
    },
  };

  let inserts = await collection.updateOne(query, update);

  return inserts;
};

// Get images of user
// export const getUserImages = async (userId: string) => {
//   let collection = getDb().collection("images");
//   const projection = { _id: 1, location: 1, key: 1, isProfile: 1 };
//   const result = await collection
//     .find({ userId })
//     .project(projection)
//     .toArray();

//   return result.map((image) => ({
//     _id: image._id,
//     location: image.location,
//     key: image.key,
//     isProfile: image.isProfile,
//   }));
// };

////////////////////////////////// UPDATE PROFILE PIC //////////////////////////////
// export const setProfilePic = async (userId: string, imageId: string) => {
//   let collection = getDb().collection("images");

//   // sets all user images as being profile false
//   const updateProfilePics = {
//     $set: {
//       isProfile: false,
//     },
//   };

//   await collection.updateMany({ userId }, updateProfilePics);

//   const updateProfilePic = {
//     $set: {
//       isProfile: true,
//     },
//   };

//   await collection.updateOne({ _id: new ObjectId(imageId) }, updateProfilePic);

//   return true;
// };

export const setProfilePicUserProfile = async (uid: string, key: string) => {
  let collection = getDb().collection("users");

  const queryUser = {
    uid,
  };

  const updateAll = {
    $set: { "images.$[].isProfile": false },
    $unset: { avatar: "" },
  };

  let update = await collection.updateOne(queryUser, updateAll);

  const queryUserAndImage = {
    uid,
    "images.key": key,
  };

  const updateImage = {
    $set: { "images.$.isProfile": true, updateDate: new Date() },
  };

  let update2 = await collection.updateOne(queryUserAndImage, updateImage);
  return update2;
};

export const setAvatarUserProfile = async (uid: string, avatar: string) => {
  let collection = getDb().collection("users");

  await collection.updateOne(
    { uid, "images.0": { $exists: true } },
    { $set: { "images.$[].isProfile": false } }
  );

  return collection.updateOne(
    { uid },
    { $set: { avatar, updateDate: new Date() } }
  );
};

////////////////////////////////// COUNT USER IMAGES //////////////////////////////
// export const countUserImages = async (email: string) => {
//   let collection = getDb().collection("users");
//   const count = await collection
//     .aggregate([
//       { $match: { email } },
//       {
//         $project: {
//           _id: 0,
//           count: { $size: "$images" },
//         },
//       },
//     ])
//     .toArray();
//   return count;
// };

////////////////////////////////// DELETE IMAGES //////////////////////////////
// export const deleteImage = async (key: string) => {
//   let collection = getDb().collection("images");
//   let result = await collection.deleteOne({ key });
//   return result;
// };

export const deleteImageUserProfile = async (uid: string, key: string) => {
  let collection = getDb().collection("users");

  const query = {
    uid,
  };

  const update = {
    $set: { updateDate: new Date() },
    $pull: { images: { key } },
  } as any;

  let inserts = await collection.updateOne(query, update);

  return inserts;
};

////////////////////////////////// GET SINGLE IMAGE /////////////////////////////
// export const getImageById = async (key: string) => {
//   let collection = getDb().collection("images");
//   const result = await collection.findOne({ key });
//   return result;
// };
