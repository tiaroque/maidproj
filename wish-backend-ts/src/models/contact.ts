import { getDb } from "../databases/db/mongo";

export const saveMessage = async (
  userId: string,
  userEmail: string,
  name: string,
  message: any
) => {
  let collection = getDb().collection("contactus");

  let dateNow = new Date(new Date().toISOString());

  const result = await collection.insertOne({
    userId,
    userEmail,
    creationDate: dateNow,
    name,
    message,
  });

  return result;
};
