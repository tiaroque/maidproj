import { Job } from 'bull';

const mongoProcess = async (job: Job) => {
    console.log(job);
}

export default mongoProcess;
