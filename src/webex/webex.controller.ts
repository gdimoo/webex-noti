import { BadRequestException, Body, Controller, Get, Headers, Post, Req } from '@nestjs/common';
import * as crypto from 'crypto';
import { WebexService } from './webex.service';
import { LeadQueueProducer } from './lead.producer';
import { LeadPayload } from './templates/lead.markdown';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

@Controller('webex')
export class WebexController {
    constructor(@InjectQueue('solar-lead') private readonly q: Queue, private readonly webex: WebexService, private readonly producer: LeadQueueProducer) { }

    @Post('lead')
    async newLead(
        @Body() dto: Omit<LeadPayload, 'registeredAt' | 'leadId'> & { leadId: string; registeredAt?: string },
    ) {
        await this.producer.enqueue({
            leadId: dto.leadId,
            registeredAt: dto.registeredAt ?? new Date().toISOString(),
            customerName: dto.customerName,
            address: dto.address,
            phone: dto.phone,
            timeMorning: dto.timeMorning,
            timeAfternoon: dto.timeAfternoon,
            detail: dto.detail,
            linkUrl: dto.linkUrl,
            linkLabel: dto.linkLabel,
            area: dto.area,
            roomId: dto.roomId,
        });
        return { queued: true };
    }

    @Post('notify')
    async notify(@Body() dto: { markdown: string; roomId?: string }) {
        await this.webex.sendToRoom(dto.markdown, dto.roomId);
        return { ok: true };
    }

    @Post('ping')
    async ping() {
        await this.webex.sendToRoom('Ping from NestJS ✅');
        return { ok: true };
    }

    @Get('queue-stats')
    async stats() {
        return this.q.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    }


    @Post('gold-now')
    async goldNow() {
        await this.webex.pushGoldNow();
        return { ok: true };
    }

    @Get('queue-failed')
    async failed() {
        const jobs = await this.q.getJobs(['failed'], 0, 10);
        return jobs.map(j => ({
            id: j.id,
            name: j.name,
            data: j.data,                 // area/roomId ที่ส่งมา
            attemptsMade: j.attemptsMade,
            failedReason: j.failedReason, // ข้อความ error หลัก
            stacktrace: j.stacktrace?.slice(0, 1),
        }));
    }

    @Post('queue-retry-failed')
    async retryAll() {
        const jobs = await this.q.getJobs(['failed'], 0, 50);
        await Promise.all(jobs.map(j => j.retry()));
        return { retried: jobs.length };
    }

    // Webhook (optional) — ใช้ตรวจลายเซ็นถ้าตั้ง webhook กับ Webex
    @Post('webhook')
    async webhook(
        @Body() body: any,
        @Headers('x-spark-signature') signature: string,
        @Req() req: any & { rawBody?: Buffer },
    ) {
        const secret = process.env.WEBHOOK_SECRET!;
        if (!req.rawBody) throw new BadRequestException('No raw body');

        const hmac = crypto.createHmac('sha1', secret).update(req.rawBody).digest('hex');
        if (signature !== hmac) throw new BadRequestException('Invalid signature');

        // ตัวอย่างตอบกลับ
        if (body?.data?.roomId) {
            await this.webex.sendToRoom(`Received: ${body.data.id}`, body.data.roomId);
        }
        return { ok: true };
    }
}
