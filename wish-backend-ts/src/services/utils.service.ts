import { ChatMessageDTO, Conversation } from "../interfaces/main-interfaces";
import { createCipheriv, createDecipheriv } from "crypto";

const ENC = "bf3c199c2470cb433d907b1e0917c17b";
const IV = "5183666c72eec9e4";
const ALGO = "aes-256-cbc";

export const asyncFnError = () => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error("Async Fn error!"));
    }, 1000);
  });
};

export const objectIsEmpty = (value: any) => {
  return Object.keys(value).length === 0 && value.constructor === Object;
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const getOldestDate = (conversations: Conversation[]) => {
  return conversations
    .map((msg) => msg.updateDate)
    .reduce(function (a, b) {
      return a < b ? a : b;
    });
};

export const getOldestDateMessage = (messages: ChatMessageDTO[]) => {
  return messages
    .map((msg) => msg.date)
    .reduce(function (a, b) {
      return a < b ? a : b;
    });
};

export const encrypt = (text: string) => {
  let cipher = createCipheriv(ALGO, ENC, IV);
  let encrypted = cipher.update(text, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
};

export const decrypt = (text: string) => {
  let decipher = createDecipheriv(ALGO, ENC, IV);
  let decrypted = decipher.update(text, "base64", "utf8");
  return decrypted + decipher.final("utf8");
};
