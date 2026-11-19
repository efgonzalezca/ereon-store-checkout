import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { ProductCard } from './product-card';
import { ProductDetailModal } from './product-detail-modal';
import {
  fetchProducts,
  productSelected,
  selectionCleared,
  selectProducts,
  selectProductsError,
  selectProductsStatus,
  selectSelectedProduct,
} from './products-slice';
import './product-page.css';

export function ProductPage() {
  const dispatch = useAppDispatch();
  const products = useAppSelector(selectProducts);
  const status = useAppSelector(selectProductsStatus);
  const error = useAppSelector(selectProductsError);
  const selectedProduct = useAppSelector(selectSelectedProduct);

  useEffect(() => {
    if (status === 'idle') {
      void dispatch(fetchProducts());
    }
  }, [dispatch, status]);

  if (status === 'failed') {
    return (
      <div role="alert" className="product-page__message product-page__error">
        <p>Could not load products. {error}</p>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => void dispatch(fetchProducts())}
        >
          Retry
        </button>
      </div>
    );
  }

  if (status === 'idle' || status === 'loading') {
    return <p className="product-page__message">Loading products...</p>;
  }

  return (
    <section aria-labelledby="catalog-title">
      <h2 id="catalog-title" className="product-page__title">
        Products
      </h2>
      <ul className="product-grid">
        {products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            onSelect={(id) => dispatch(productSelected(id))}
          />
        ))}
      </ul>
      {selectedProduct && (
        <ProductDetailModal
          key={selectedProduct.id}
          product={selectedProduct}
          onClose={() => dispatch(selectionCleared())}
        />
      )}
    </section>
  );
}
