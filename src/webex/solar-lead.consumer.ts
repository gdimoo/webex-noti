import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, UnrecoverableError } from 'bullmq';
import { WebexService } from './webex.service';
import { leadMarkdown, LeadPayload } from './templates/lead.markdown';

const SPACE_MAP: Record<string, string> = {
    // north: 'ROOM_ID_NORTH',
    // central: 'ROOM_ID_CENTRAL',
    // south: 'ROOM_ID_SOUTH',
};

@Processor('solar-lead')
export class SolarLeadConsumer extends WorkerHost {
    constructor(private readonly webex: WebexService) { super(); }

    async process(job: Job<LeadPayload>): Promise<void> {
        if (job.name !== 'webex-notify') return;

        const { area, roomId } = job.data;
        const targetRoom =
            roomId ??
            (area ? SPACE_MAP[area] : undefined) ??
            process.env.WEBEX_ROOM_ID; // fallback

        if (!targetRoom) {
            // config ผิดจริง ให้หยุดรีทราย
            throw new UnrecoverableError(`missing roomId (area=${area})`);
        }

        const md = leadMarkdown(job.data);
        try {
            await this.webex.sendToRoom(md, targetRoom);
        } catch (e: any) {
            // โยนรายละเอียด Webex error ไปที่ failedReason
            const status = e?.response?.status;
            const body = e?.response?.data;
            throw new Error(`webex send failed: ${status} ${JSON.stringify(body)}`);
        }
    }
}
