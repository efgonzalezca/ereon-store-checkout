import { DataSource } from 'typeorm';
import { ProductOrmEntity } from '../../modules/products/infrastructure/product.orm-entity';

type ProductSeed = Pick<
  ProductOrmEntity,
  'id' | 'name' | 'description' | 'priceInCents' | 'stock' | 'imageUrl'
>;

const product = (
  n: number,
  name: string,
  description: string,
  priceInCents: number,
  stock: number,
  image: string,
): ProductSeed => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
  name,
  description,
  priceInCents,
  stock,
  imageUrl: `/images/products/${image}.webp`,
});

export const PRODUCTS_SEED: ProductSeed[] = [
  product(
    1,
    'Wireless Headphones',
    'Over-ear headphones with noise cancelling and 30h battery.',
    38990000,
    25,
    'wireless-headphones',
  ),
  product(
    2,
    'Mechanical Keyboard',
    'Compact mechanical keyboard with tactile switches and backlight.',
    28990000,
    15,
    'mechanical-keyboard',
  ),
  product(
    3,
    'Ergonomic Mouse',
    'Vertical wireless mouse designed to reduce wrist strain.',
    15990000,
    40,
    'ergonomic-mouse',
  ),
  product(
    4,
    'USB-C Hub',
    '7-in-1 hub with HDMI, SD reader and fast charging pass-through.',
    11990000,
    60,
    'usb-c-hub',
  ),
  product(
    5,
    'Portable Speaker',
    'Water-resistant Bluetooth speaker with 12h playback.',
    21990000,
    12,
    'portable-speaker',
  ),
  product(
    6,
    'Smart Watch',
    'Fitness tracker with heart rate, GPS and 7-day battery.',
    54990000,
    8,
    'smart-watch',
  ),
  product(
    7,
    'Laptop Stand',
    'Adjustable aluminium stand compatible with 11 to 17 inch laptops.',
    9990000,
    30,
    'laptop-stand',
  ),
  product(
    8,
    'HD Webcam',
    '1080p webcam with autofocus and built-in dual microphones.',
    24990000,
    3,
    'hd-webcam',
  ),
  product(
    9,
    'Desk Lamp',
    'LED desk lamp with adjustable colour temperature.',
    8990000,
    1,
    'desk-lamp',
  ),
  product(
    10,
    'Limited Edition Backpack',
    'Water-repellent 20L backpack with padded laptop sleeve.',
    17990000,
    0,
    'limited-backpack',
  ),
];

export async function seedProducts(dataSource: DataSource): Promise<void> {
  await dataSource
    .createQueryBuilder()
    .insert()
    .into(ProductOrmEntity)
    .values(PRODUCTS_SEED)
    .orIgnore()
    .execute();
}
