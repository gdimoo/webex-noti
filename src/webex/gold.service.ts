import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import * as https from 'https';

type GoldApiResponse = {
    price: number;          // THB per troy ounce
    metal: 'XAU';
    currency: 'THB';
    timestamp?: number;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// 1 บาททอง ~ 15.244 g, 1 ozt = 31.1034768 g → ~0.4901 ozt/บาททอง
const OZT_PER_BAHT = 15.244 / 31.1034768;

export type GoldSnapshot = {
    source: 'SPOT';
    updatedAt: string;
    spotThbPerOzt: number;
    bahtWeightPrice: number; // ประมาณการราคาต่อ "บาททอง"
};

@Injectable()
export class GoldService {
    private agent = new https.Agent({ keepAlive: true });
    constructor(private http: HttpService) { }

    async get(): Promise<GoldSnapshot> {
        const token = process.env.GOLDAPI_TOKEN;
        if (!token) throw new Error('Missing GOLDAPI_TOKEN');

        const url = 'https://www.goldapi.io/api/XAU/THB';
        let lastErr: any;

        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const { data } = await this.http.axiosRef.get<GoldApiResponse>(url, {
                    timeout: 30000,
                    httpsAgent: this.agent,
                    headers: { 'x-access-token': token, 'Accept': 'application/json' },
                });

                const thbPerOzt = Number(data?.price);
                if (!Number.isFinite(thbPerOzt)) throw new Error('Invalid GoldAPI response');

                return {
                    source: 'SPOT',
                    updatedAt: data.timestamp ? new Date(data.timestamp * 1000).toISOString() : new Date().toISOString(),
                    spotThbPerOzt: thbPerOzt,
                    bahtWeightPrice: thbPerOzt * OZT_PER_BAHT,
                };
            } catch (e) {
                lastErr = e;
                if (attempt < 3) await sleep(1000 * attempt); // simple backoff
            }
        }
        throw lastErr;
    }
}
