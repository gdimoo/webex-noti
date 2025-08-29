import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { LeadPayload } from './templates/lead.markdown';

export type SolarLeadJob = LeadPayload;

@Injectable()
export class LeadQueueProducer {
    constructor(@InjectQueue('solar-lead') private q: Queue<SolarLeadJob>) { }

    async enqueue(job: SolarLeadJob) {
        await this.q.add('webex-notify', job, {
            jobId: `lead:${job.leadId}`,      // กันซ้ำ
            attempts: 5,
            backoff: { type: 'exponential', delay: 2000 },
        });
    }
}
