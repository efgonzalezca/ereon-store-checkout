import { useState } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { checkoutStarted } from '@/features/checkout/state/checkout-slice';
import { formatCents } from '@/shared/format/currency';
import { Modal } from '@/shared/ui/modal';
import { Product } from '../state/product.types';
import { selectionCleared } from '../state/products-slice';
import { QuantitySelect } from './quantity-select';

interface ProductDetailModalProps {
  product: Product;
  onClose: () => void;
}

export function ProductDetailModal({
  product,
  onClose,
}: ProductDetailModalProps) {
  const dispatch = useAppDispatch();
  const isOutOfStock = product.stock === 0;
  const [quantity, setQuantity] = useState(isOutOfStock ? 0 : 1);

  return (
    <Modal labelledBy="product-title" onClose={onClose}>
      <div className="product-detail">
        <img
          className="product-detail__image"
          src={product.imageUrl}
          alt={product.name}
          width={600}
          height={600}
          decoding="async"
        />
        <div className="product-detail__info">
          <h2 id="product-title" className="product-detail__name">
            {product.name}
          </h2>
          <p className="product-detail__price">
            {formatCents(product.priceInCents)}
          </p>
          <p className="product-detail__description">{product.description}</p>
          <p
            className={
              isOutOfStock
                ? 'product-detail__stock product-detail__stock--empty'
                : 'product-detail__stock'
            }
          >
            {isOutOfStock ? 'Out of stock' : `${product.stock} available`}
          </p>
          <QuantitySelect
            label="Quantity"
            value={quantity}
            max={product.stock}
            disabled={isOutOfStock}
            onChange={setQuantity}
          />
          <button
            type="button"
            className="button button--primary product-detail__pay"
            disabled={isOutOfStock}
            onClick={() => {
              dispatch(checkoutStarted({ productId: product.id, quantity }));
              dispatch(selectionCleared());
            }}
          >
            Pay with credit card
          </button>
        </div>
      </div>
    </Modal>
  );
}
