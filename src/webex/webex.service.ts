import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GoldService, GoldSnapshot } from './gold.service';
import * as dayjs from 'dayjs';
import 'dayjs/locale/th';
import axios from 'axios';
dayjs.locale('th');

@Injectable()
export class WebexService {
    private readonly logger = new Logger(WebexService.name);
    constructor(private http: HttpService, private gold: GoldService) { }

    private get headers() {
        return {
            Authorization: `Bearer ${process.env.WEBEX_BOT_TOKEN}`,
            'Content-Type': 'application/json',
        };
    }
    
    async listRooms(): Promise<Array<{ id: string; title: string }>> {
        let url = 'https://webexapis.com/v1/rooms?max=100';
        const out: Array<{ id: string; title: string }> = [];
        for (; ;) {
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${process.env.WEBEX_BOT_TOKEN}` },
            });
            out.push(...res.data.items.map((r: any) => ({ id: r.id, title: r.title })));
            const link: string | undefined = res.headers['link'];
            const next = link && /<([^>]+)>;\s*rel="next"/.exec(link)?.[1];
            if (!next) break;
            url = next;
        }
        return out;
    }

    async getRoomIdByTitle(title: string): Promise<string | null> {
        const rooms = await this.listRooms();
        return rooms.find(r => r.title === title)?.id ?? null;
    }

    async sendToRoom(markdown: string, roomId = process.env.WEBEX_ROOM_ID!) {
        await this.http.axiosRef.post('https://webexapis.com/v1/messages',
            { roomId, markdown },
            { headers: { Authorization: `Bearer ${process.env.WEBEX_BOT_TOKEN}`, 'Content-Type': 'application/json' } }
        );
    }

    private async composeGoldMarkdown() {
        const g: GoldSnapshot = await this.gold.get();
        return [
            `**ราคาทอง (Spot XAU/THB)** 🟡 *(GoldAPI)*`,
            `อัปเดต: ${new Date(g.updatedAt).toLocaleString('th-TH')}`,
            `- Spot: ~${Math.round(g.spotThbPerOzt).toLocaleString('th-TH')} บาท/ออนซ์ (ozt)`,
            `- คิดเป็น ~${Math.round(g.bahtWeightPrice).toLocaleString('th-TH')} บาท/บาททอง *(ประมาณการ)*`,
        ].join('\n');
    }

    // ส่งทุกชั่วโมง นาทีตรง
    @Cron(CronExpression.EVERY_HOUR)
    async pushGoldEveryHour() {
        try {
            const md = await this.composeGoldMarkdown();
            await this.sendToRoom(md);
            this.logger.log('Sent gold price to Webex');
        } catch (e) {
            this.logger.error('Gold push failed', e as any);
        }
    }

    // เรียกใช้ด้วย HTTP เพื่อส่งทันที
    async pushGoldNow() {
        const md = await this.composeGoldMarkdown();
        await this.sendToRoom(md);
    }
}
