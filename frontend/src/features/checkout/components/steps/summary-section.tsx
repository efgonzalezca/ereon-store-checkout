import { ReactNode } from 'react';
import { Product } from '@/features/products/state/product.types';
import { formatCents } from '@/shared/format/currency';
import { CardBrandLogo } from '../card-brand-logo';
import { CheckoutState, DataSection } from '../../state/checkout.types';

interface SummarySectionProps {
  product: Product;
  checkout: CheckoutState;
  onEdit: (section: DataSection) => void;
}

interface GroupProps {
  title: string;
  onEdit?: () => void;
  children: ReactNode;
}

function Group({ title, onEdit, children }: GroupProps) {
  return (
    <section className="summary__group">
      <div className="summary__group-header">
        <h3 className="summary__group-title">{title}</h3>
        {onEdit && (
          <button
            type="button"
            className="link-button"
            aria-label={`Edit ${title.toLowerCase()}`}
            onClick={onEdit}
          >
            Edit
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

export function SummarySection({
  product,
  checkout,
  onEdit,
}: SummarySectionProps) {
  const { customer, shipping, installments, quantity } = checkout;

  return (
    <div className="summary">
      <Group title="Product">
        <p>
          {product.name} × {quantity}
        </p>
        <p className="summary__strong">
          Subtotal: {formatCents(product.priceInCents * quantity)}
        </p>
      </Group>
      <Group title="Personal info" onEdit={() => onEdit(1)}>
        <p>{customer.fullName}</p>
        <p>
          {customer.documentType} {customer.documentNumber}
        </p>
        <p>
          {customer.email} · {customer.phone}
        </p>
      </Group>
      <Group title="Shipping info" onEdit={() => onEdit(2)}>
        <p>{shipping.address}</p>
        <p>
          {shipping.city}, {shipping.region} {shipping.postalCode}
        </p>
      </Group>
      <Group title="Card info" onEdit={() => onEdit(3)}>
        <p className="summary__card">
          <CardBrandLogo brand={checkout.cardBrand} />
          <span>•••• {checkout.cardLast4}</span>
        </p>
        <p>
          {installments} {installments === 1 ? 'installment' : 'installments'}
        </p>
      </Group>
    </div>
  );
}
