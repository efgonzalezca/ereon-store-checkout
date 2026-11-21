import dataSource from '../data-source';
import { seedProducts } from './products.seed';

async function run(): Promise<void> {
  await dataSource.initialize();
  try {
    await seedProducts(dataSource);
    console.log('Seed completed');
  } finally {
    await dataSource.destroy();
  }
}

run().catch((error: unknown) => {
  console.error('Seed failed', error);
  process.exit(1);
});
