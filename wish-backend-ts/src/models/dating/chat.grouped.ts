// import { Observable, Subject, asapScheduler, buffer, debounceTime } from "rxjs";
// import { ChatMessageDTO } from "./chat";
// import { ObjectId } from "mongodb";

// export const debounceList = new Map<string, {
//     subject: Subject<any>,
//     debounce: Observable<any[]>,
//     // peers: {
//     //     uid1: string,
//     //     uid2: string
//     // }
// }>();

// function aggregateMessagesBySender(data: ChatMessageDTO[]) {

//     let indexes = [0];
//     let conversationId = data[0].conversationId;

//     //Breaks the array by sender chunks and type of message
//     data.reduce((previousValue, currentValue, idx) => {
//         if (previousValue.sender !== currentValue.sender ||
//             previousValue.type !== currentValue.type) {
//             indexes.push(idx);
//         }

//         return currentValue;
//     });

//     indexes.push(data.length);

//     let insertMessagesList = new Array<any>();

//     indexes.reduce((previousIdx, currentIdx) => {

//         let msgListChunck: ChatMessageDTO[] = data.slice(previousIdx, currentIdx);

//         let sender = msgListChunck[0].sender;

//         let type = msgListChunck[0].type;
//         let date = msgListChunck[msgListChunck.length - 1].date;

//         let messageObj = {
//             conversationId: new ObjectId(conversationId),
//             ...type === "message" ? { messages: new Array<any>() } : null,
//             ...type === "media" ? { images: new Array<any>() } : null,
//             type,
//             sender,
//             date
//         };

//         msgListChunck.forEach(msg => {
//             msg.message && messageObj.messages!.push(msg.message);
//             msg.image && messageObj.images!.push(msg.image);
//         });

//         insertMessagesList.push(messageObj);

//         return currentIdx;
//     });

//     return insertMessagesList;
// }

// export const addMessageInMemory = async (conversationId: string, message: ChatMessageDTO) => {

//     let sender = message.sender;
//     let receiver = message.receiver;

//     //  Selects the conversation from the Dictionary
//     let debounceConversation = debounceList.get(conversationId);

//     // First message of the conversation, it doenst yet exists
//     if (!debounceConversation) {

//         let subject = new Subject<any>();

//         // Debounce the subject messages and buffers all the previous values when emitting 
//         let debounce = subject.pipe(
//             buffer(
//                 subject.pipe(debounceTime(10000, asapScheduler))
//             ));

//         // Set the Dictionary with the Conversation Object on the FIRST MESSAGE received for the conversation
//         debounceList.set(conversationId, {
//             subject,
//             debounce,
//         });

//         // Triggers the Save into DB
//         debounce.subscribe((msgList: ChatMessageDTO[]) => {
//             saveIntoDb(msgList);
//             updateLastMessage(msgList);
//         });

//         subject.next(message);
//     }
//     else {
//         debounceConversation.subject.next(message);

//     }
//     // else if (debounceConversation.sender !== sender) {
//     //     debounceList[conversationId].subject.complete();
//     //     let subject = new Subject();
//     //     let debounce = subject.pipe(buffer(subject.pipe(debounceTime(5000, asapScheduler))));
//     //     debounce.subscribe(saveIntoDb);
//     //     debounceList[conversationId] = {
//     //         sender: sender,
//     //         subject,
//     //         debounce
//     //     };
//     //     subject.next({ sender, msg })
//     // }
// }



// ////////////// Not used on the moment /////////////////////////////////

// export const updateUnreadMessages = async (dataList: ChatMessageDTO[]) => {
//     let conversationId = dataList[0].conversationId;
//     let conversationObj = debounceList.get(conversationId);
//     let uid1 = conversationObj?.peers.uid1 as string;
//     let uid2 = conversationObj?.peers.uid2 as string;;
//     let uid1UnreadSent = dataList.filter(msg => msg.unread && msg.sender === uid1).length;
//     let uid2UnreadSent = dataList.filter(msg => msg.unread && msg.sender === uid2).length;
//     let collectionConversations = getDb().collection('conversations');
//     const query = {
//         _id: new ObjectId(conversationId)
//     };
//     const update = {
//         $inc: {
//             [`unread.${uid1}`]: uid2UnreadSent,
//             [`unread.${uid2}`]: uid1UnreadSent
//         }
//     };
//     await collectionConversations.updateOne(
//         query,
//         update
//     )
// }

// Get the past messages of a conversation
// export const getMessages = async (userIdFrom: string, userIdTo: string) => {
//     let collection = getDb().collection('conversations');
//     const items = await collection.aggregate([
//         {
//             $match: {
//                 participants: {
//                     $all: [
//                         { $elemMatch: { $eq: userIdFrom } },
//                         { $elemMatch: { $eq: userIdTo } }
//                     ]
//                 }
//             }
//         },
//         {
//             $lookup:
//             {
//                 'from': 'messages',
//                 'let': {
//                     'id': '$_id'
//                 },
//                 'pipeline': [
//                     { '$match': { '$expr': { '$eq': ['$conversationId', '$$id'] } } },
//                     { '$project': { _id: 0, converstationId: 0 } },
//                     { "$sort": { "date": -1 } },
//                     { "$skip": 0 },
//                     { "$limit": 2 }
//                 ],
//                 'as': 'messages'
//             }
//         }
//     ]).toArray();
//     return items;
// }


// async function insertMongoMessage(msg: string[], conversationId: string, sender: any, date: Date, collectionMessages: Collection<any>) {

//     let _id = new ObjectId();

//     let messageObj = {
//         _id,
//         conversationId: new ObjectId(conversationId),
//         messages: msg,
//         sender,
//         date
//     };

//     const query = { _id: _id };

//     const update = {
//         $set: messageObj,
//         // $setOnInsert: {
//         //     creationDate: dateNow,
//         // }
//     };

//     const options = { upsert: true };

//     const resultMongo = await collectionMessages.updateOne(query, update, options);

//     return _id;
// }
