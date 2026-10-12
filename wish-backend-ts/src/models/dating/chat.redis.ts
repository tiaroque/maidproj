// export const addMessageUsingRedis = async (conversationId: string, message: ChatMessageDTO) => {

//     let redis = getRedisConnection();
//     let collectionMessages = getDb().collection('messages');

//     let dateStr = message.date;
//     let date = new Date(dateStr);
//     let sender = message.sender;
//     let msg = message.message;

//     // Check if there is previous messages
//     let messageReturn = await redis.hgetall(conversationId);

//     let isEmpty = objectIsEmpty(messageReturn);

//     if (isEmpty) { // First Message

//         let _id = await insertMongoMessage([msg], conversationId, sender, date, collectionMessages);
//         const resultRedis = await redis.hset(conversationId, "mongoMessageId", _id.toHexString(), "date", dateStr, "sender", sender);
//     }
//     else if (messageReturn.sender !== sender) {
//         let _id = await insertMongoMessage([msg], conversationId, sender, date, collectionMessages);
//         const resultRedis = await redis.hset(conversationId, "mongoMessageId", _id.toHexString(), "date", dateStr, "sender", sender);
//     }
//     else {

//         let previousDateStr = messageReturn.date;
//         let previousDate = new Date(previousDateStr);
//         let previousSender = messageReturn.sender;
//         let previousMongoMessageId = messageReturn.mongoMessageId;

//         const query = { _id: new ObjectId(previousMongoMessageId) };

//         const update = {
//             $push: { messages: msg },
//             $set: {
//                 date
//             }
//         };

//         const options = { upsert: true };

//         const resultMongo = await collectionMessages.updateOne(query, update, options);

//         const resultRedis = await redis.hset(conversationId, "date", dateStr, "sender", sender);

//         // await redis.hdel(conversationId, "mongoMessageId", "date", "sender", "msg");

//         // //    // let previousDate = messageReturn.date;
//         // //    let previousMsg = JSON.parse(messageReturn.msg)
//         // //    let previousSender = messageReturn.sender;


//         // //    if (previousSender === sender) {
//         // //        previousMsg.push(msg);
//         // //        redis.hset(conversationId, "date", date, "msg", JSON.stringify(previousMsg))
//         // //    }
//         // //    else {

//         // //        let newMsg = [msg];
//         // //        redis.hset(conversationId, "date", date, "sender", sender, "msg", JSON.stringify(newMsg))
//         // //    }
//     }

//     console.log("conversationId: ", conversationId)
//     console.log("message: ", message)
// }
