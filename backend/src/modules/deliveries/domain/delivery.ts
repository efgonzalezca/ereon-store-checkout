export const DELIVERY_STATUSES = ['ASSIGNED', 'SHIPPED', 'DELIVERED'] as const;

export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number];

export interface ShippingAddress {
  readonly address: string;
  readonly city: string;
  readonly region: string;
  readonly postalCode: string;
}
