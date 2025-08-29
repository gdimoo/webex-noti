import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json } from 'express';
import { AppModule } from './app.module';
import { rawBodyMiddleware } from './common/raw-body.middleware';

import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter as BullBoardExpress } from '@bull-board/express';
import { getQueueToken } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as basicAuth from 'express-basic-auth';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });

  // ---- MOUNT bull-board BEFORE app.init() ----
  const serverAdapter = new BullBoardExpress();
  serverAdapter.setBasePath('/admin/queues');
  const { setQueues } = createBullBoard({ queues: [], serverAdapter });

  const express = app.getHttpAdapter().getInstance();
  const user = process.env.BULL_BOARD_USER || 'admin';
  const pass = process.env.BULL_BOARD_PASS || 'changeme';
  express.use('/admin/queues', (basicAuth as any)({ users: { [user]: pass }, challenge: true }));
  express.use('/admin/queues', serverAdapter.getRouter());
  express.get('/admin/queues/ping', (_req, res) => res.send('ok'));

  // --------------------------------------------

  // middlewares ปกติ
  app.use(rawBodyMiddleware);
  app.use(json({ limit: '1mb' }));

  await app.init(); // DI พร้อมแล้วค่อยผูกคิวเข้า board

  // ใส่คิวเข้า bull-board
  const solarLead = app.get<Queue>(getQueueToken('solar-lead'));
  const adapter = new (BullMQAdapter as any)(solarLead as any) as any; // cast กัน type mismatch
  setQueues([adapter]);

  app.enableCors();

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`> Admin Queues: http://localhost:${port}/admin/queues`);
}
bootstrap();
