import { useParams, useNavigate } from 'react-router-dom';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Save,
  UserPlus,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
// Removed supabase import
import { customerService, type Customer, type CreateCustomerPayload, type UpdateCustomerPayload } from '@/services/customerService'; // Added customerService import

// Database types
// type CustomerInsert = Database['public']['Tables']['customer_mgmt']['Insert'];

// Form field configuration interface
interface FormFieldConfig {
  name: keyof CustomerFormValues;
  label: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'textarea' | 'checkbox';
  placeholder?: string;
  required?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  options?: { value: string; label: string }[];
  validation?: z.ZodTypeAny;
  gridCols?: 1 | 2;
}

// Dynamic form configuration
const formFieldsConfig: FormFieldConfig[] = [
  {
    name: 'name',
    label: 'Full Name',
    type: 'text',
    placeholder: 'Enter full name',
    required: true,
    icon: User,
    validation: z.string().min(1, 'Full name is required').max(100, 'Full name must be less than 100 characters'),
    gridCols: 2,
  },
  {
    name: 'phone',
    label: 'Phone Number',
    type: 'tel',
    placeholder: '10 digits',
    required: true,
    icon: Phone,
    validation: z.string().regex(/^[0-9]{10}$/, 'Phone number must be 10 digits'),
    gridCols: 2,
  },
  {
    name: 'email',
    label: 'Email Address',
    type: 'email',
    placeholder: 'example@example.com',
    icon: Mail,
    validation: z.string().email('Invalid email format').optional().or(z.literal('')).refine((val) => val === val!.toLowerCase(), {
    message: "Email must not contain uppercase letters"
  }),
    gridCols: 2,
  },
  {
    name: 'status',
    label: 'Status',
    type: 'select',
    required: true,
    icon: CheckCircle,
    options: [
      { value: 'Active', label: 'Active' },
      { value: 'Inactive', label: 'Inactive' },
    ],
    validation: z.enum(['Active', 'Inactive'], {
      required_error: 'Please select a status',
    }),
    gridCols: 2,
  },
  {
    name: 'billingAddress',
    label: 'Billing Address',
    type: 'textarea',
    placeholder: 'Enter customer billing address',
    icon: MapPin,
    validation: z.string().max(500, 'Address must be less than 500 characters').optional().or(z.literal('')),
    gridCols: 1,
  },
  {
    name: 'shippingAddress',
    label: 'Shipping Address',
    type: 'textarea',
    placeholder: 'Enter customer shipping address',
    icon: MapPin,
    validation: z.string().max(500, 'Address must be less than 500 characters').optional().or(z.literal('')),
    gridCols: 1,
  },
  {
    name: 'contactPerson',
    label: 'Contact Person',
    type: 'text',
    placeholder: 'Enter contact person name',
    icon: User,
    validation: z.string().max(100, 'Contact person name must be less than 100 characters').optional().or(z.literal('')),
    gridCols: 2,
  },
  {
    name: 'taxNumber',
    label: 'Tax Number',
    type: 'text',
    placeholder: 'Enter tax number',
    icon: Calendar,
    validation: z.string().max(50, 'Tax number must be less than 50 characters').optional().or(z.literal('')),
    gridCols: 2,
  },
];

// Dynamic schema generation
const createFormSchema = () => {
  const schemaFields: Record<string, z.ZodTypeAny> = {};
  
  formFieldsConfig.forEach(field => {
    if (field.validation) {
      schemaFields[field.name] = field.validation;
    }
  });
  
  return z.object(schemaFields);
};

const customerFormSchema = createFormSchema();
type CustomerFormValues = z.infer<typeof customerFormSchema>;

// Generate customer ID
function generateCustomerId(lastNumber = 1): string {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yy = String(now.getFullYear()).slice(-2);
  const serial = String(lastNumber).padStart(4, '0');
  return `CUST-${dd}${mm}${yy}-${serial}`;
}

// Dynamic field renderer component
const FormFieldRenderer: React.FC<{
  field: FormFieldConfig;
  register: any;
  errors: any;
  watch: any;
  setValue: any;
  clearValidationErrors: () => void;
}> = ({ field, register, errors, watch, setValue, clearValidationErrors }) => {
  const IconComponent = field.icon;
  const fieldError = errors[field.name];
  const fieldValue = watch(field.name);

  const baseInputClasses = `${
    fieldError 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-200' 
      : 'border-gray-200 focus:border-blue-500 focus:ring-blue-200'
  } transition-all duration-200`;

  const labelClasses = `${
    fieldError ? 'text-red-500' : 'text-gray-700'
  } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`;

  const renderField = () => {
    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
        return (
          <Input
            id={field.name}
            type={field.type}
            placeholder={field.placeholder}
            {...register(field.name)}
            onChange={() => {
              if (fieldError) {
                clearValidationErrors();
              }
            }}
            className={`${baseInputClasses} pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200`}
          />
        );

      case 'select':
        return (
          <Select 
            value={fieldValue} 
            onValueChange={(value) => {
              setValue(field.name, value);
              if (fieldError) {
                clearValidationErrors();
              }
            }}
          >
            <SelectTrigger className={`${baseInputClasses} pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200`}>
              <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'textarea':
        return (
          <Textarea
            id={field.name}
            placeholder={field.placeholder}
            {...register(field.name)}
            onChange={() => {
              if (fieldError) {
                clearValidationErrors();
              }
            }}
            className={`w-full resize-none min-h-[100px] ${baseInputClasses} pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200`}
          />
        );

      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={field.name}
              checked={fieldValue}
              onCheckedChange={(checked) => {
                setValue(field.name, checked as boolean);
              }}
              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
            />
            <Label htmlFor={field.name} className="text-sm text-gray-600">
              Enable email notifications for this customer
            </Label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`space-y-2 group ${field.gridCols === 1 ? 'md:col-span-2' : ''}`}>
      <Label htmlFor={field.name} className={labelClasses}>
        {IconComponent && <IconComponent className="h-4 w-4" />} 
        {field.label} {field.required && <span className="text-red-500">*</span>}
      </Label>
      {renderField()}
      {fieldError && (
        <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
          <AlertCircle className="h-3 w-3" />
          {fieldError.message}
        </p>
      )}
    </div>
  );
};

export default function CustomerForm() {
  const userData = localStorage.getItem('userData');
  const user = userData ? JSON.parse(userData) : null;
  const companyId = user?.company_id;
  const userId = user?.id;

  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);
  const [isLoading, setIsLoading] = useState(false);
  const [_, setError] = useState('');
  const [currentCustomerId, setCurrentCustomerId] = useState<string | null>('');

  // Create default values dynamically
  const createDefaultValues = (): CustomerFormValues => {
    const defaults: any = {};
    formFieldsConfig.forEach(field => {
      if (field.type === 'checkbox') {
        defaults[field.name] = false;
      } else if (field.name === 'status') {
        defaults[field.name] = 'Active';
      } else {
        defaults[field.name] = '';
      }
    });
    return defaults;
  };

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
    trigger,
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: createDefaultValues(),
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
  });

  // Generate customer ID for new customers
  useEffect(() => {
    const fetchAndSetNextCustomerId = async () => {
      if (isEditing) return;
      if (!companyId) return;
      
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yy = String(now.getFullYear()).slice(-2);
      const todayPrefix = `CUST-${dd}${mm}${yy}-`;
      
      try {
        // Fetch customers with today's prefix to determine next serial number
        const response = await customerService.listCustomers({
          search: todayPrefix
        });
        
        let nextSerial = 1;
        if (response.data && response.data.length > 0) {
          // Find the highest serial number
          const serials = response.data
            .map(customer => customer.customerId)
            .filter(id => id.startsWith(todayPrefix))
            .map(id => {
              const match = id.match(/-(\d{4})$/);
              return match ? parseInt(match[1], 10) : 0;
            });
          
          if (serials.length > 0) {
            nextSerial = Math.max(...serials) + 1;
          }
        }
        
        // Store the generated ID for later use
        localStorage.setItem('nextCustomerId', generateCustomerId(nextSerial));
      } catch (err) {
        console.error('Error generating customer ID:', err);
        // Fallback to default ID generation
        localStorage.setItem('nextCustomerId', generateCustomerId());
      }
    };
    
    fetchAndSetNextCustomerId();
  }, [isEditing, companyId]);

  // Fetch customer data for editing
  useEffect(() => {
    if (isEditing && id) {
      setIsLoading(true);
      const fetchCustomer = async () => {
        try {
          const response = await customerService.getCustomer(id);
          const customer = response.data;

          if (!customer) throw new Error('Failed to fetch customer');

          // Map database fields to form fields
          const formData: any = {};
          formFieldsConfig.forEach(field => {
            switch (field.name) {
              case 'name':
                formData[field.name] = customer.name || '';
                break;
              case 'phone':
                formData[field.name] = customer.phone || '';
                break;
              case 'email':
                formData[field.name] = customer.email || '';
                break;
              case 'status':
                formData[field.name] = customer.status || 'Active';
                break;
              case 'billingAddress':
                formData[field.name] = customer.billingAddress || '';
                break;
              case 'shippingAddress':
                formData[field.name] = customer.shippingAddress || '';
                break;
              case 'contactPerson':
                formData[field.name] = customer.contactPerson || '';
                break;
              case 'taxNumber':
                formData[field.name] = customer.taxNumber || '';
                break;
              default:
                formData[field.name] = '';
            }
          });

          reset(formData);
          setCurrentCustomerId(customer.customerId);
        } catch (err) {
          setError('Failed to load customer data');
          toast.error('Failed to load customer data');
        } finally {
          setIsLoading(false);
        }
      };
      fetchCustomer();
    }
  }, [id, isEditing, reset]);

  // Helper function to clear validation errors
  const clearValidationErrors = () => {
    setError('');
  };

  // Function to handle form submission with proper validation
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear any existing validation errors
    clearValidationErrors();
    
    // Trigger validation for all fields
    const isValid = await trigger();
    
    if (!isValid) {
      setError('Please fix the validation errors before submitting.');
      return;
    }
    
    // If validation passes, submit the form
    handleSubmit(onSubmit)(e);
  };

  const onSubmit: SubmitHandler<CustomerFormValues> = async (data) => {
    console.log('Form submitted with data:', data);
    setError('');
    
    try {
      setIsLoading(true);

      // Map form data to database fields
      const customerPayload: CreateCustomerPayload | UpdateCustomerPayload = {
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        billingAddress: data.billingAddress || '',
        shippingAddress: data.shippingAddress || '',
        contactPerson: data.contactPerson || '',
        taxNumber: data.taxNumber || '',
        status: data.status,
        company: companyId || ''
      };

      if (isEditing && id) {
        // Update existing customer
        const updatePayload: UpdateCustomerPayload = {
          ...customerPayload,
          company: undefined // Remove company from update payload
        };
        
        const response = await customerService.updateCustomer(id, updatePayload);
        
        if (!response.data) throw new Error('Customer update failed');
        
        toast.success('Customer updated successfully!');
      } else {
        // Get the generated customer ID
        const nextCustomerId = localStorage.getItem('nextCustomerId') || generateCustomerId();
        
        // Add customerId to the payload for creation
        const createPayload: CreateCustomerPayload = {
          ...customerPayload,
          customerId: nextCustomerId
        } as CreateCustomerPayload;
        
        const response = await customerService.createCustomer(createPayload);
        
        if (!response.data) throw new Error('Customer creation failed');
        
        // Clear the stored customer ID
        localStorage.removeItem('nextCustomerId');
        
        toast.success('Customer created successfully!');
      }

      setTimeout(() => navigate('/dashboard/customer-management'), 1000);
    } catch (error: any) {
      console.error('Error submitting form:', error);
      setError(error.message || 'Failed to save customer. Please check all fields and try again.');
      toast.error(error.message || 'Failed to save customer. Please check all fields and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && isEditing) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
        <p className="text-lg font-medium text-gray-700">Loading customer data...</p>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-8">
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
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditing ? 'Update Customer' : 'Create New Customer'}
              </h1>
              <p className="text-gray-600">Create or update customer information</p>
            </div>
          </div>
        </div>

        <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
          <CardHeader>
            <CardTitle className="text-xl text-blue-800">Customer Information</CardTitle>
            <CardDescription className="text-blue-600">
              {isEditing ? 'Update the customer details below' : 'Fill in the customer details below to create a new customer'}
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleFormSubmit} className="space-y-6" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {formFieldsConfig.map((field) => (
                  <FormFieldRenderer
                    key={field.name}
                    field={field}
                    register={register}
                    errors={errors}
                    watch={watch}
                    setValue={setValue}
                    clearValidationErrors={clearValidationErrors}
                  />
                ))}
              </div>

              <div className="pt-4 border-t flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  * Required fields
                </div>
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate('/dashboard/customer-management')}
                    className="border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || isLoading}
                    className= "text-white transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg disabled:opacity-50"
                  >
                    {(isSubmitting || isLoading) ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {isEditing ? 'Updating...' : 'Creating...'}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        {isEditing ? <Save className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                        {isEditing ? 'Update Customer' : 'Create Customer'}
                      </span>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}