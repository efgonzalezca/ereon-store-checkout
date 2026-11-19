import { ProductPage } from '@/features/products/product-page';

export function App() {
  return (
    <div className="app">
      <header className="app__header">
        <div className="app__container">
          <h1 className="app__title">Ereon Store</h1>
        </div>
      </header>
      <main className="app__main app__container">
        <ProductPage />
      </main>
    </div>
  );
}
