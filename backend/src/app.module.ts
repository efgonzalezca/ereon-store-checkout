import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { EnvironmentVariables, validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { CustomersModule } from './modules/customers/customers.module';
import { HealthModule } from './health/health.module';
import { GlobalExceptionFilter } from './shared/filters/global-exception.filter';
import { ResultInterceptor } from './shared/interceptors/result.interceptor';
import { PaymentsModule } from './modules/payments/payments.module';
import { ProductsModule } from './modules/products/products.module';
import { AppLoggerModule } from './shared/logger/logger.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    AppLoggerModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => [
        {
          ttl: config.get<number>('THROTTLE_TTL') * 1000,
          limit: config.get<number>('THROTTLE_LIMIT'),
        },
      ],
    }),
    DatabaseModule,
    HealthModule,
    ProductsModule,
    CustomersModule,
    PaymentsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: ResultInterceptor },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
})
export class AppModule {}
