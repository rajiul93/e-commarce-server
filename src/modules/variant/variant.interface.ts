export interface Variant {
  _id?: string;
  productId: string;
  sku: string;
  attributes: {
    name: string;
    value: string;
  }[];
  price: number;
  buyPrice: number;
  stock: number;
  image?: string;
  status: 'active' | 'inactive';
}

export type VariantPair = Variant['attributes'][number];
