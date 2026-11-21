import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { EnvironmentVariables } from '../../config/env.validation';
import { buildPinoHttpOptions } from './pino-http.options';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        forRoutes: ['{*splat}'],
        pinoHttp: buildPinoHttpOptions(
          config.get('NODE_ENV') === 'test' ? 'silent' : 'info',
        ),
      }),
    }),
  ],
})
export class AppLoggerModule {}
