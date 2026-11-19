import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { EnvironmentVariables } from './config/env.validation';
import { TRACE_ID_HEADER } from './shared/logger/trace-id';

export function configureApp(app: NestExpressApplication): void {
  const config =
    app.get<ConfigService<EnvironmentVariables, true>>(ConfigService);

  app.set('trust proxy', 2);
  app.setGlobalPrefix('api');

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubDomains: true,
      },
      xContentTypeOptions: true,
      referrerPolicy: { policy: 'no-referrer' },
      xFrameOptions: { action: 'deny' },
    }),
  );

  app.enableCors({
    origin: config.get<string[]>('CORS_ORIGIN'),
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', TRACE_ID_HEADER],
    exposedHeaders: [TRACE_ID_HEADER],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}
