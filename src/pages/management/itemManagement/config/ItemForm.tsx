// Define the form data structure
export interface ItemFormData {
  id?: string;
  name: string;
  code?: string;
  categoryId: string;
  description: string;
  reorderLevel?: number;
  maxLevel?: number;
  unitOfMeasure?: string;
  vendorId?: string;
  unitPrice?: number;
  currency?: 'INR' | 'AED';
  quantity?: number;
  purchaseDate?: string;
  status?: string;
  sellingPrice?: number;
  manufacturer?: string;
  model?: string;
  minStockLevel?: number;
  maxStockLevel?: number;
}