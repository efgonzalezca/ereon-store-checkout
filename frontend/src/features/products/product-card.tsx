import { formatCents } from '@/shared/format/currency';
import { Product } from './product.types';

interface ProductCardProps {
  product: Product;
  onSelect: (productId: string) => void;
}

export function ProductCard({ product, onSelect }: ProductCardProps) {
  return (
    <li className="product-grid__item">
      <button
        type="button"
        className="product-card"
        onClick={() => onSelect(product.id)}
      >
        <img
          className="product-card__image"
          src={product.imageUrl}
          alt=""
          width={300}
          height={300}
          loading="lazy"
          decoding="async"
        />
        <span className="product-card__name">{product.name}</span>
        <span className="product-card__price">
          {formatCents(product.priceInCents)}
        </span>
        <span
          className={
            product.stock === 0
              ? 'product-card__stock product-card__stock--empty'
              : 'product-card__stock'
          }
        >
          {product.stock === 0 ? 'Out of stock' : `${product.stock} in stock`}
        </span>
      </button>
    </li>
  );
}
