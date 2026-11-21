import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation';
import { buildTypeOrmOptions } from './typeorm.config';

describe('buildTypeOrmOptions', () => {
  it('builds postgres options from configuration and never synchronizes the schema', () => {
    const values: Record<string, unknown> = {
      DB_HOST: 'db',
      DB_PORT: 5432,
      DB_USER: 'user',
      DB_PASS: 'pass',
      DB_NAME: 'name',
      DB_SSL: true,
    };
    const config = {
      get: (key: string) => values[key],
    } as unknown as ConfigService<EnvironmentVariables, true>;

    expect(buildTypeOrmOptions(config)).toEqual({
      type: 'postgres',
      host: 'db',
      port: 5432,
      username: 'user',
      password: 'pass',
      database: 'name',
      ssl: true,
      autoLoadEntities: true,
      synchronize: false,
    });
  });
});
