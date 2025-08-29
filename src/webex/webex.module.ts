import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bullmq';
import { WebexService } from './webex.service';
import { WebexController } from './webex.controller';
import { GoldService } from './gold.service';
import { LeadQueueProducer } from './lead.producer';
import { SolarLeadConsumer } from './solar-lead.consumer';

@Module({
  imports: [HttpModule, BullModule.registerQueue({ name: 'solar-lead' })],
  controllers: [WebexController],
  providers: [WebexService, LeadQueueProducer, SolarLeadConsumer, GoldService],
})
export class WebexModule { }
