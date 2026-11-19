import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

export interface HealthResponse {
  status: 'ok';
  uptime: number;
  timestamp: string;
}

@SkipThrottle()
@Controller('health')
export class HealthController {
  @Get()
  check(): HealthResponse {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
