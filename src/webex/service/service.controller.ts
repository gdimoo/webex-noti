// src/webex/webex.controller.ts
import { Controller, Post } from '@nestjs/common';
import { WebexService } from '../webex.service';

@Controller('webex')
export class WebexController {
    constructor(private readonly webex: WebexService) { }
    @Post('gold-now')
    async sendGoldNow() {
        await this.webex.pushGoldEveryHour(); // reuse logic
        return { ok: true };
    }
}
