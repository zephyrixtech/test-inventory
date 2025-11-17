import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
} from '@/components/ui/card';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { customerService } from '@/services/customerService'; // Added customerService import

import type { Customer } from '@/services/customerService';

interface InfoFieldProps {
  label: string;
  value: string | number | boolean | null | undefined;
  icon: React.ComponentType<{ className?: string }>;
  type?: 'text' | 'email' | 'phone' | 'textarea' | 'badge' | 'boolean';
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive';
}

// Custom Badge Component
const CustomBadge: React.FC<{ 
  children: React.ReactNode; 
  variant?: 'default' | 'secondary' | 'success' | 'warning' | 'destructive';
  className?: string;
}> = ({ children, variant = 'default', className = '' }) => {
  const baseClasses = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium";
  
  const variantClasses = {
    default: "bg-gray-100 text-gray-800",
    secondary: "bg-blue-100 text-blue-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    destructive: "bg-red-100 text-red-800",
  };
  
  return (
    <span className={`${baseClasses} ${variantClasses[variant]} ${className}`}>
      {children}
    </span>
  );
};

// Info Field Component
const InfoField: React.FC<InfoFieldProps> = ({ label, value, icon: Icon, type = 'text', variant = 'default' }) => {
  // Handle undefined values by converting them to null
  const displayValue = value === undefined ? null : value;
  
  if (displayValue === null || displayValue === '') {
    return (
      <div className="py-3">
        <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {label}
        </Label>
        <p className="mt-1 text-sm text-gray-400">Not provided</p>
      </div>
    );
  }

  let renderedValue: React.ReactNode = String(displayValue);
  
  switch (type) {
    case 'email':
      renderedValue = (
        <a href={`mailto:${displayValue}`} className="text-blue-600 hover:underline">
          {displayValue}
        </a>
      );
      break;
    case 'phone':
      renderedValue = (
        <a href={`tel:${displayValue}`} className="text-blue-600 hover:underline">
          {displayValue}
        </a>
      );
      break;
    case 'badge':
      renderedValue = (
        <CustomBadge variant={variant}>
          {String(displayValue)}
        </CustomBadge>
      );
      break;
    case 'boolean':
      renderedValue = (
        <div className="flex items-center gap-1">
          {displayValue ? (
            <CheckCircle className="h-4 w-4 text-green-500" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-500" />
          )}
          <span>{displayValue ? 'Yes' : 'No'}</span>
        </div>
      );
      break;
  }

  return (
    <div className="py-3">
      <Label className="text-sm font-medium text-gray-500 flex items-center gap-2">
        <Icon className="h-4 w-4" />
        {label}
      </Label>
      <p className="mt-1 text-sm text-gray-900">{renderedValue}</p>
    </div>
  );
};

export default function CustomerView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get user data from localStorage

  useEffect(() => {
    if (!id) {
      setError('Missing customer ID');
      setIsLoading(false);
      return;
    }

    const fetchCustomer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await customerService.getCustomer(id);
        const customerData = response.data;

        if (!customerData) {
          throw new Error('Customer not found');
        }

        setCustomer(customerData);
      } catch (err: any) {
        console.error('Error fetching customer:', err);
        setError(err.message || 'Failed to load customer data');
        toast.error(err.message || 'Failed to load customer data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomer();
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <p className="text-lg font-medium text-gray-700">Loading customer data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <h3 className="text-lg font-medium">Error</h3>
              </div>
              <p className="mt-2 text-red-700">{error}</p>
              <div className="mt-4">
                <Button onClick={() => navigate('/dashboard/customer-management')}>
                  Back to Customer List
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Customer Not Found</h3>
              <p className="text-gray-500 mb-4">The requested customer could not be found.</p>
              <Button onClick={() => navigate('/dashboard/customer-management')}>
                Back to Customer List
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard/customer-management')}
            className="hover:bg-blue-100 transition-colors duration-200 rounded-full"
          >
            <ArrowLeft className="h-5 w-5 text-blue-600" />
          </Button>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <User className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Customer Details</h1>
              <p className="text-gray-600">View detailed information about this customer</p>
            </div>
          </div>
        </div>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoField 
                label="Customer ID" 
                value={customer.customerId} 
                icon={User} 
              />
              
              <InfoField 
                label="Name" 
                value={customer.name} 
                icon={User} 
              />
              
              <InfoField 
                label="Phone" 
                value={customer.phone} 
                icon={Phone} 
                type="phone"
              />
              
              <InfoField 
                label="Email" 
                value={customer.email} 
                icon={Mail} 
                type="email"
              />
              
              <InfoField 
                label="Contact Person" 
                value={customer.contactPerson} 
                icon={User} 
              />
              
              <InfoField 
                label="Status" 
                value={customer.status} 
                icon={CheckCircle} 
                type="badge"
                variant={customer.status === 'Active' ? 'success' : 'destructive'}
              />
              
              <InfoField 
                label="Tax Number" 
                value={customer.taxNumber} 
                icon={Building} 
              />
              
              <InfoField 
                label="Billing Address" 
                value={customer.billingAddress} 
                icon={MapPin} 
                type="textarea"
              />
              
              <InfoField 
                label="Shipping Address" 
                value={customer.shippingAddress} 
                icon={MapPin} 
                type="textarea"
              />
              
              <InfoField 
                label="Created At" 
                value={customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : null} 
                icon={Calendar} 
              />
              
              <InfoField 
                label="Updated At" 
                value={customer.updatedAt ? new Date(customer.updatedAt).toLocaleDateString() : null} 
                icon={Calendar} 
              />
            </div>
            
            <div className="pt-6 border-t flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => navigate('/dashboard/customer-management')}
              >
                Back
              </Button>
              <Button
                onClick={() => navigate(`/dashboard/customer-management/edit/${customer._id}`)}
              >
                Edit Customer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}