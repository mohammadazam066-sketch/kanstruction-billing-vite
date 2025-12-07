
import type { Timestamp } from 'firebase/firestore';

export const PRODUCT_CATEGORIES = [
  "Cement",
  "Steel",
  "Hardware",
  "Plywood",
  "Electrical Items",
  "Paint",
  "Rice / Food grains",
  "Others",
] as const;

export type ProductCategory = typeof PRODUCT_CATEGORIES[number];

export interface BillItem {
  id: string;
  category: ProductCategory | "";
  productName: string;
  hsnCode?: string;
  details?: string;
  quantity: number;
  unitPrice: number; // This will always store the TAXABLE unit price
  gstRate: number;
  isGstInclusive: boolean;
  taxableValue: number;
  gstAmount: number;
  total: number;
}

export type BusinessDetails = {
  businessName: string;
  ownerName: string;
  gstin: string;
  address: string;
};

export type CustomerDetails = {
    customerName: string;
    customerGstin: string;
    billDate: Date;
};


// Firestore document types
export interface Invoice extends BusinessDetails, Omit<CustomerDetails, 'billDate'> {
    id: string;
    userId: string;
    billDate: Timestamp;
    subtotal: number;
    totalGst: number;
    grandTotal: number;
    createdAt: Timestamp;
}

export interface InvoiceItem extends Omit<BillItem, 'id' | 'taxableValue' | 'gstAmount' > {
    id: string;
}


declare global {
  interface Window {
    recaptchaVerifier?: import('firebase/auth').RecaptchaVerifier;
  }
}
