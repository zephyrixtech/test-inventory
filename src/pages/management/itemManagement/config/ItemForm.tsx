import React, { useState, useEffect, ChangeEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createItem, updateItem, getCategories, getVendors } from '@/services/itemService';
import { ItemData } from '@/services/itemService';

// Define the form data structure
export interface ItemFormData {
  id?: string;
  name: string;
  code?: string;
  categoryId: string;
  description?: string;
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

interface ItemFormProps {
  initialData?: ItemFormData;
  onSubmit: (data: ItemFormData) => void;
}

const ItemForm: React.FC<ItemFormProps> = ({ initialData, onSubmit }) => {
  const [formData, setFormData] = React.useState<ItemFormData>({
    name: initialData?.name || '',
    code: initialData?.code || '',
    categoryId: initialData?.categoryId || '',
    description: initialData?.description || '',
    reorderLevel: initialData?.reorderLevel,
    maxLevel: initialData?.maxLevel,
    unitOfMeasure: initialData?.unitOfMeasure,
    vendorId: initialData?.vendorId,
    unitPrice: initialData?.unitPrice || 0,
    currency: initialData?.currency || 'INR',
    quantity: initialData?.quantity,
    purchaseDate: initialData?.purchaseDate,
    status: initialData?.status,
    sellingPrice: initialData?.sellingPrice || 0,
    manufacturer: initialData?.manufacturer || '',
    model: initialData?.model || '',
    minStockLevel: initialData?.minStockLevel,
    maxStockLevel: initialData?.maxStockLevel
  });

  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch categories and vendors
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        const categoriesData = await getCategories();
        const vendorsData = await getVendors();
        setCategories(categoriesData);
        setVendors(vendorsData);
      } catch (error) {
        console.error('Error fetching dropdown data:', error);
      }
    };

    fetchDropdownData();
  }, []);

  const handleChange = (field: keyof ItemFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Prepare data for API call
      const itemData: ItemData = {
        name: formData.name,
        code: formData.code || formData.name.substring(0, 3).toUpperCase() + Math.floor(Math.random() * 1000).toString().padStart(3, '0'),
        categoryId: formData.categoryId,
        description: formData.description,
        reorderLevel: formData.reorderLevel,
        maxLevel: formData.maxLevel,
        unitOfMeasure: formData.unitOfMeasure,
        vendorId: formData.vendorId,
        unitPrice: formData.unitPrice,
        currency: formData.currency,
        quantity: formData.quantity,
        purchaseDate: formData.purchaseDate,
        status: formData.status
      };
      
      if (initialData?.id) {
        // Update existing item
        await updateItem(initialData.id, itemData);
      } else {
        // Create new item
        await createItem(itemData);
      }
      
      onSubmit(formData);
    } catch (error) {
      console.error('Error saving item:', error);
      // In a real app, you would show an error message to the user
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name *</label>
          <Input
            required
            value={formData.name}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('name', e.target.value)}
            placeholder="Enter item name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category *</label>
          <Select
            value={formData.categoryId}
            onValueChange={(value: string) => handleChange('categoryId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Description</label>
          <Input
            value={formData.description || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('description', e.target.value)}
            placeholder="Enter item description"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Vendor</label>
          <Select
            value={formData.vendorId || ''}
            onValueChange={(value: string) => handleChange('vendorId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select vendor" />
            </SelectTrigger>
            <SelectContent>
              {vendors.map((vendor) => (
                <SelectItem key={vendor.id} value={vendor.id}>
                  {vendor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Model</label>
          <Input
            value={formData.model || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('model', e.target.value)}
            placeholder="Enter model"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Unit Price</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.unitPrice || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('unitPrice', parseFloat(e.target.value) || 0)}
            placeholder="Enter unit price"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Selling Price</label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={formData.sellingPrice || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('sellingPrice', parseFloat(e.target.value) || 0)}
            placeholder="Enter selling price"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Reorder Level</label>
          <Input
            type="number"
            min="0"
            value={formData.reorderLevel || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('reorderLevel', parseInt(e.target.value) || 0)}
            placeholder="Enter reorder level"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max Stock Level</label>
          <Input
            type="number"
            min="0"
            value={formData.maxLevel || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('maxLevel', parseInt(e.target.value) || 0)}
            placeholder="Enter maximum stock level"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Unit of Measure</label>
          <Input
            value={formData.unitOfMeasure || ''}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleChange('unitOfMeasure', e.target.value)}
            placeholder="Enter unit of measure"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Currency</label>
          <Select
            value={formData.currency || 'INR'}
            onValueChange={(value: string) => handleChange('currency', value as 'INR' | 'AED')}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INR">INR</SelectItem>
              <SelectItem value="AED">AED</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <Button
          type="submit"
          disabled={loading}
          className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg transition-all duration-200"
        >
          {loading ? 'Saving...' : (initialData ? 'Update Item' : 'Add Item')}
        </Button>
      </div>
    </form>
  );
};

export default ItemForm;