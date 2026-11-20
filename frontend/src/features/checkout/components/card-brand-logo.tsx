import { CardBrand } from '../form/validators/card.validators';

export function CardBrandLogo({ brand }: { brand: CardBrand | null }) {
  if (brand === 'VISA') {
    return (
      <svg
        className="card-brand"
        viewBox="0 0 48 30"
        role="img"
        aria-label="Visa"
      >
        <rect width="48" height="30" rx="4" fill="#1a3fa0" />
        <text
          x="24"
          y="21"
          textAnchor="middle"
          fontSize="14"
          fontWeight="700"
          fontStyle="italic"
          fill="#fff"
        >
          VISA
        </text>
      </svg>
    );
  }
  if (brand === 'MASTERCARD') {
    return (
      <svg
        className="card-brand"
        viewBox="0 0 48 30"
        role="img"
        aria-label="Mastercard"
      >
        <rect width="48" height="30" rx="4" fill="#1b1b1b" />
        <circle cx="19" cy="15" r="9" fill="#eb001b" />
        <circle cx="29" cy="15" r="9" fill="#f79e1b" fillOpacity="0.9" />
      </svg>
    );
  }
  return null;
}
