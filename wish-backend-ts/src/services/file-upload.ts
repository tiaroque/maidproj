import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import multer from "multer";
import config from "../endpoints.config";

export var s3Client = new S3Client({
  region: "eu-west-3",
  credentials: {
    accessKeyId: config.AWSAccessKeyId,
    secretAccessKey: config.AWSSecretKey,
  },
});

///////////////////////////// Multer ///////////////////////////////////////////////////////////////

const fileFilter = (req: any, file: any, cb: any) => {
  if (
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/png"
  ) {
    cb(null, true);
  } else {
    cb(new Error("Image uploaded is not of type jpg/jpeg or png"), false);
  }
};

// // MULTER S3 direct store to Amazon S3
// const storageS3 = (bucketName: string) =>
//   multers3({
//     s3: s3Client,
//     bucket: bucketName,
//     // acl: 'public-read', // Set public read permissions
//     contentType: multers3.AUTO_CONTENT_TYPE, // Auto detect contet type
//     // metadata: function (req, file, cb) {
//     //     cb(null, { email: req.user.email, originalname: encodeURIComponent(file.originalname) });
//     // },
//     key: function (req, file, cb) {
//       let extension = path.extname(file.originalname);
//       const key = `${req.uid}/${v1()}${extension}`;

//       cb(null, "pictures/" + key);
//     },
//   });

export const deleteObject = async (
  bucketName: string,
  keyList: { Key: string }[]
) => {
  const command = new DeleteObjectsCommand({
    Bucket: bucketName,
    Delete: {
      Objects: [...keyList],
    },
  });

  try {
    const { Deleted } = await s3Client.send(command);
    console.log(
      `Successfully deleted ${
        Deleted!.length
      } objects from S3 bucket. Deleted objects:`
    );
    console.log(Deleted!.map((d) => ` • ${d.Key}`).join("\n"));
    return true;
  } catch (err) {
    console.error(err);
    return false;
  }
};

export const uploads3 = multer({
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024, // 1 MB (max file size)
  },
  storage: multer.memoryStorage(),
  // storage: storageS3(config.AWSBucketName),
});

// Camera photos are larger than cropped gallery uploads; they get downscaled before storage.
export const uploadSelfie = multer({
  fileFilter: fileFilter,
  limits: {
    fileSize: 8 * 1024 * 1024,
  },
  storage: multer.memoryStorage(),
});

// export const uploads3Chat = multer({
//   fileFilter: fileFilter,
//   limits: {
//     fileSize: 1024 * 1024, // 1 MB (max file size)
//   },
//   storage: multer.memoryStorage(),
//   // storage: storageS3(config.AWSBucketNameChat),
// });
/////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////// S3 Directly //////////////////////////////////////////////////
// export const getSignedUrlS3 = async (user_id: string) => {
//   const key = `${user_id}/${v1()}.jpeg`;

//   const command = new GetObjectCommand({
//     Bucket: config.AWSBucketName,
//     Key: key,
//   });
//   const url = await getSignedUrl(s3Client, command, { expiresIn: 15 * 60 }); // expires in seconds

//   // return s3Client.getSignedUrlPromise('putObject', {
//   //     Bucket: config.AWSBucketName,
//   //     ContentType: 'image/jpeg',
//   //     Key: key
//   // });
// };
/////////////////////////////////////////////////////////////////////////////////////////////

// let storage = memoryStorage();
// const upload2 = multer({ storage: storage, fileFilter: fileFilter });
