import { Global, INestApplication, Module, Type } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { DatabaseModule } from '../src/database/database.module';

const fakeDataSource = {
  entityMetadatas: [],
  options: { type: 'postgres' },
  getRepository: () => ({}),
};

@Global()
@Module({
  providers: [{ provide: getDataSourceToken(), useValue: fakeDataSource }],
  exports: [getDataSourceToken()],
})
class NoDatabaseModule {}

interface TestAppOptions {
  controllers?: Type[];
  providerOverrides?: Array<{ token: unknown; value: unknown }>;
}

export async function createTestApp(
  options: TestAppOptions = {},
): Promise<INestApplication> {
  let builder = Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  })
    .overrideModule(DatabaseModule)
    .useModule(NoDatabaseModule);

  for (const { token, value } of options.providerOverrides ?? []) {
    builder = builder.overrideProvider(token).useValue(value);
  }

  const app = (
    await builder.compile()
  ).createNestApplication<NestExpressApplication>();
  configureApp(app);
  await app.init();
  return app;
}
