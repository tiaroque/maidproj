import Bull from 'bull';


import mongoProcess from '../../workers/dating/mongo.process';


const mongoQueue = new Bull('mongo');

mongoQueue.process(mongoProcess);

export const saveChatMessages = (data: Array<any>) => {
    mongoQueue.add(data, {

    }); 
}