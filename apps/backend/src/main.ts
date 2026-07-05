import { json } from 'express';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { resolveCorsOrigin } from './shared/http';

const JSON_BODY_LIMIT = '1mb';

async function bootstrap() {
  const corsOrigin = resolveCorsOrigin();

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(json({ limit: JSON_BODY_LIMIT }));
  app.set('trust proxy', 1);

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 4000);
}

void bootstrap();
