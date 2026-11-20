import { Product } from '@/features/products/state/product.types';
import { formatCents } from '@/shared/format/currency';

interface OrderSummaryProps {
  product: Product;
  quantity: number;
}

export function OrderSummary({ product, quantity }: OrderSummaryProps) {
  return (
    <aside className="order-summary" aria-label="Order summary">
      <img
        className="order-summary__image"
        src={product.imageUrl}
        alt=""
        width={64}
        height={64}
        decoding="async"
      />
      <div className="order-summary__info">
        <p className="order-summary__name">{product.name}</p>
        <p className="order-summary__quantity">Quantity: {quantity}</p>
      </div>
      <p className="order-summary__price">
        {formatCents(product.priceInCents * quantity)}
      </p>
    </aside>
  );
}
