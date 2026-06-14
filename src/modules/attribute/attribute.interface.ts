export interface Attribute {
  _id?: string;
  name: string;
  values: string[];
  status: 'active' | 'inactive';
}

/** Persisted attributes; `status` optional on insert (defaults to active in schema/service). */
export type AttributeCreateInput = Omit<Attribute, '_id' | 'status'> & Partial<Pick<Attribute, 'status'>>;
