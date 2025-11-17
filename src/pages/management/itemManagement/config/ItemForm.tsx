import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface ItemFormData {
  id?: string;
  name: string;
  description: string;
  categoryId: string;
  manufacturer: string;
  model: string;
  unitPrice: number;
  sellingPrice: number;
  minStockLevel: number;
  maxStockLevel: number;
  code?: string;
  reorderLevel?: number;
  maxLevel?: number;
  unitOfMeasure?: string;
  vendorId?: string;
  currency?: 'INR' | 'AED';
  quantity?: number;
  purchaseDate?: string;
  status?: string;
}

interface ItemFormProps {
  initialData?: ItemFormData;
  onSubmit: (data: ItemFormData) => void;
}

const CATEGORY_OPTIONS = [
  'Lights',
  'Engine Parts',
  'Brake System',
  'Suspension',
  'Electrical',
  'Body Parts',
] as const;

const ItemForm: React.FC<ItemFormProps> = ({ initialData, onSubmit }) => {
  const [formData, setFormData] = useState<ItemFormData>({
    id: initialData?.id,
    name: initialData?.name ?? '',
    description: initialData?.description ?? '',
    categoryId: initialData?.categoryId ?? '',
    manufacturer: initialData?.manufacturer ?? '',
    model: initialData?.model ?? '',
    unitPrice: initialData?.unitPrice ?? 0,
    sellingPrice: initialData?.sellingPrice ?? 0,
    minStockLevel: initialData?.minStockLevel ?? 0,
    maxStockLevel: initialData?.maxStockLevel ?? 0,
    code: initialData?.code,
    reorderLevel: initialData?.reorderLevel,
    maxLevel: initialData?.maxLevel,
    unitOfMeasure: initialData?.unitOfMeasure,
    vendorId: initialData?.vendorId,
    currency: initialData?.currency,
    quantity: initialData?.quantity,
    purchaseDate: initialData?.purchaseDate,
    status: initialData?.status,
  });

  const handleChange = <K extends keyof ItemFormData>(field: K, value: ItemFormData[K]) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <Input
            required
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter item name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <Select
            value={formData.categoryId}
            onValueChange={(value) => handleChange('categoryId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Description</label>
          <Input
            required
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Enter item description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Manufacturer</label>
          <Input
            required
            value={formData.manufacturer}
            onChange={(e) => handleChange('manufacturer', e.target.value)}
            placeholder="Enter manufacturer"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Model</label>
          <Input
            required
            value={formData.model}
            onChange={(e) => handleChange('model', e.target.value)}
            placeholder="Enter model"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Unit Price</label>
          <Input
            required
            type="number"
            min="0"
            step="0.01"
            value={formData.unitPrice}
            onChange={(e) => handleChange('unitPrice', Number(e.target.value) || 0)}
            placeholder="Enter unit price"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Selling Price</label>
          <Input
            required
            type="number"
            min="0"
            step="0.01"
            value={formData.sellingPrice}
            onChange={(e) => handleChange('sellingPrice', Number(e.target.value) || 0)}
            placeholder="Enter selling price"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Min Stock Level</label>
          <Input
            required
            type="number"
            min="0"
            value={formData.minStockLevel}
            onChange={(e) => handleChange('minStockLevel', Number(e.target.value) || 0)}
            placeholder="Enter minimum stock level"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max Stock Level</label>
          <Input
            required
            type="number"
            min="0"
            value={formData.maxStockLevel}
            onChange={(e) => handleChange('maxStockLevel', Number(e.target.value) || 0)}
            placeholder="Enter maximum stock level"
          />
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button
          type="submit"
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all duration-200"
        >
          {initialData ? 'Update Item' : 'Add Item'}
        </Button>
      </div>
    </form>
  );
};

export default ItemForm;