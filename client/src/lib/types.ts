export interface ProductFamilySerializer {
  id: string;
  PK: string;
  SK: string;
  name: string;
  description?: string;
  default_items: any[];
  base_margin: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  family_id?: string | null;
  custom_fields?: Record<string, any>;
}

export interface ProductColumn {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'date' | 'formula';
  editable: boolean;
  options?: string[];
  formula?: string;
}

export interface QuoteItem {
  id: string;
  name: string;
  qty: number;
  unit_price: number;
  unit_type: string;
  total: number;
}

export interface QuoteFamily {
  family_id: string;
  family_name: string;
  category: string;
  items: QuoteItem[];
  subtotal: number;
  margin_applied: number;
}

export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'EMPLOYEE';
  org_id: string;
  org_name: string;
}