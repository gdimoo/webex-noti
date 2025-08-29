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

import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });

  // Swagger
  const cfg = new DocumentBuilder()
    .setTitle('Webex Noti API')
    .setDescription('API สำหรับส่งแจ้งเตือน Webex + Queue')
    .setVersion('1.0.0')
    .build();
  const doc = SwaggerModule.createDocument(app, cfg);
  SwaggerModule.setup('/docs', app, doc);

  // ---------- MOUNT bull-board ก่อน init ----------
  const serverAdapter = new BullBoardExpress();
  serverAdapter.setBasePath('/admin/queues');
  const { setQueues } = createBullBoard({ queues: [], serverAdapter });

  const express = app.getHttpAdapter().getInstance();
  const user = process.env.BULL_BOARD_USER || 'admin';
  const pass = process.env.BULL_BOARD_PASS || 'changeme';
  express.use('/admin/queues', (basicAuth as any)({ users: { [user]: pass }, challenge: true }));
  express.use('/admin/queues', serverAdapter.getRouter());
  express.get('/admin/queues/ping', (_req, res) => res.send('ok'));
  // ------------------------------------------------

  // middleware ปกติ
  app.use(rawBodyMiddleware);
  app.use(json({ limit: '1mb' }));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  await app.init(); // DI พร้อม

  // ใส่คิวเข้า bull-board (cast กัน type mismatch)
  const solarLead = app.get<Queue>(getQueueToken('solar-lead'));
  setQueues([new (BullMQAdapter as any)(solarLead as any)]);

  app.enableCors();
  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`> API:           http://localhost:${port}`);
  console.log(`> Bull Board:    http://localhost:${port}/admin/queues`);
  console.log(`> Swagger:       http://localhost:${port}/docs`);
}
bootstrap();
