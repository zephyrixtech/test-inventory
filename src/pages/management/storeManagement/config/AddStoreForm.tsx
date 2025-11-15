import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, CheckCircle, Loader2, Store, AlertCircle, Phone, Mail, MapPin, CreditCard, User, Check, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { IUser, IStore } from "@/Utils/constants";
import { storeService } from "@/services/storeService";
import { userService } from "@/services/userService";

interface ExtendedUser extends IUser {
  role: {
    id: string | null;
    role_name: string;
  };
}

// Validation schema for the store form
const createStoreSchema = (centralStoreExists: boolean, isEditing: boolean) =>
  z
    .object({
      code: z
        .string()
        .min(1, "Store id is required")
        .length(6, "Store id must be exactly 6 characters")
        .trim(),
      name: z
        .string()
        .min(1, "Store Name is required")
        .max(100, "Store Name cannot exceed 100 characters")
        .trim(),
      address: z
        .string()
        .min(1, "Street Address is required")
        .max(200, "Street Address cannot exceed 200 characters")
        .trim(),
      city: z
        .string()
        .min(1, "City is required")
        .max(100, "City cannot exceed 100 characters")
        .trim(),
      state: z
        .string()
        .min(1, "State/Province is required")
        .max(100, "State/Province cannot exceed 100 characters")
        .trim(),
      postalCode: z
        .string()
        .min(1, "Postal Code is required")
        .max(20, "Postal Code cannot exceed 20 characters")
        .trim(),
      country: z
        .string()
        .min(1, "Country is required")
        .max(100, "Country cannot exceed 100 characters")
        .trim(),
      phone: z
        .string()
        .min(1, "Phone number is required")
        .max(20, "Phone number cannot exceed 20 characters")
        .trim(),
      email: z
        .string()
        .min(1, "Email is required")
        .email("Please enter a valid email address")
        .refine((val) => val === val.toLowerCase(), {
          message: "Email must not contain uppercase letters"
        }),
      type: z
        .enum(["Central Store", "Branch Store"], {
          required_error: "Store type is required",
        })
        .refine(
          (value) => {
            if (!isEditing && value === "Central Store" && centralStoreExists) {
              return false;
            }
            return true;
          },
          {
            message: "Only one Central Store is allowed. A Central Store already exists.",
          }
        ),
      parent_id: z.string().optional(),
      bank_name: z.string().max(100, "Bank name cannot exceed 100 characters").optional().or(z.literal("")),
      bank_account_number: z.string().max(50, "Bank account number cannot exceed 50 characters").optional().or(z.literal("")),
      bank_ifsc_code: z.string().max(20, "IFSC code cannot exceed 20 characters").optional().or(z.literal("")),
      bank_iban_code: z.string().max(34, "IBAN code cannot exceed 34 characters").optional().or(z.literal("")),
      tax_code: z
        .string()
        .min(1, "Tax code is required")
        .max(50, "Tax code cannot exceed 50 characters")
        .trim(),
      store_manager_id: z.string().min(1, "Store manager is required"),
      direct_purchase_allowed: z.boolean(),
    })
    .refine(
      (data) => {
        if (data.type === "Central Store") {
          return !data.parent_id || data.parent_id.trim() === "";
        }
        if (data.type === "Branch Store") {
          return data.parent_id && data.parent_id.trim() !== "";
        }
        return true;
      },
      {
        message: "Parent store is required for Branch Store",
        path: ["parent_id"],
      }
    )
    .superRefine((data, ctx) => {
      if (data.bank_account_number && !data.bank_ifsc_code && !data.bank_iban_code) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one of IFSC Code or IBAN Code is required when Bank Account Number is provided",
          path: ["bank_ifsc_code"],
        });
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "At least one of IFSC Code or IBAN Code is required when Bank Account Number is provided",
          path: ["bank_iban_code"],
        });
      }
    });

type StoreFormData = z.infer<ReturnType<typeof createStoreSchema>>;

// Helper to safely extract ID from value
const extractId = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) return (value as { id: string }).id;
  return "";
};

// Interface for user data stored in local storage
interface UserData {
  id: string;
  email: string;
  email_confirmed: boolean;
  created_at: string;
  last_sign_in: string;
  first_name: string;
  last_name: string;
  role_id: string;
  status: string;
  company_id: string;
  full_name: string;
}

export default function AddStoreForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [managers, setManagers] = useState<ExtendedUser[]>([]);
  const [store, setStore] = useState<IStore | null>(null);
  const [parentStores, setParentStores] = useState<IStore[]>([]);
  const [isLoadingStore, setIsLoadingStore] = useState(false);
  const [centralStoreExists, setCentralStoreExists] = useState(false);
  const [isCheckingCentralStore, setIsCheckingCentralStore] = useState(!id);
  const [formError, setFormError] = useState<string | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [initialCheckComplete, setInitialCheckComplete] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Store ID validation state
  const [storeIdValidationStatus, setStoreIdValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [storeIdValidationMessage, setStoreIdValidationMessage] = useState<string>('');
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isEditing = Boolean(id);

  // Get default values based on central store existence
  const getDefaultValues = useCallback((): StoreFormData => ({
    code: "",
    name: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "",
    phone: "",
    email: "",
    type: (!isEditing && centralStoreExists) ? "Branch Store" : "Central Store",
    parent_id: "",
    bank_name: "",
    bank_account_number: "",
    bank_ifsc_code: "",
    bank_iban_code: "",
    tax_code: "",
    store_manager_id: "",
    direct_purchase_allowed: false,
  }), [centralStoreExists, isEditing]);

  // Create schema with current state
  const storeSchema = createStoreSchema(centralStoreExists, isEditing);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setError,
    clearErrors,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<StoreFormData>({
    resolver: zodResolver(storeSchema),
    defaultValues: getDefaultValues(),
  });

  const watchedStoreType = watch("type");
  const watchedBankAccountNumber = watch("bank_account_number");
  const watchedBankIfscCode = watch("bank_ifsc_code");
  const watchedBankIbanCode = watch("bank_iban_code");
  const watchedStoreCode = watch("code");

  // Clear errors for IFSC and IBAN when either is provided and bank account number is present,
  // or when bank account number is cleared
  useEffect(() => {
    if (!watchedBankAccountNumber || watchedBankIfscCode || watchedBankIbanCode) {
      clearErrors(["bank_ifsc_code", "bank_iban_code"]);
    }
  }, [watchedBankAccountNumber, watchedBankIfscCode, watchedBankIbanCode, clearErrors]);

  // Fetch company_id from local storage on component mount
  useEffect(() => {
    try {
      const userDataString = localStorage.getItem("userData");
      if (userDataString) {
        const userData: UserData = JSON.parse(userDataString);
        if (userData.company_id) {
          setCompanyId(userData.company_id);
          setUserId(userData.id);
        } else {
          throw new Error("Company ID not found in user data");
        }
      } else {
        throw new Error("User data not found in local storage");
      }
    } catch (error) {
      console.error("Error fetching company_id from local storage:", error);
      toast.error("Failed to load user data. Please log in again.", {
        position: "top-right",
      });
      navigate("/login");
    }
  }, [navigate]);

  // Check if a Central Store already exists
  const checkCentralStoreExists = useCallback(async () => {
    if (isEditing || !companyId) {
      setInitialCheckComplete(true);
      return;
    }

    setIsCheckingCentralStore(true);
    try {
      // Use storeService to check if a central store exists
      const response = await storeService.listStores({ type: "Central Store" });
      
      // The apiClient will throw an error if the response is not ok, so we don't need to check for errors here
      const data = response.data;
      
      const exists = data && data.length > 0;
      setCentralStoreExists(exists);
      setInitialCheckComplete(true);

      // Reset form with correct default type
      const defaultType = exists ? "Branch Store" : "Central Store";
      reset({
        ...getDefaultValues(),
        type: defaultType
      });

      clearErrors("type");
    } catch (error) {
      console.error("Error checking central stores:", error);
      // On error, assume central store exists to be safe
      setCentralStoreExists(true);
      setInitialCheckComplete(true);
      reset({
        ...getDefaultValues(),
        type: "Branch Store"
      });
      clearErrors("type");
      toast.error("Failed to check store configuration. Please try again.", {
        position: "top-right",
      });
    } finally {
      setIsCheckingCentralStore(false);
    }
  }, [isEditing, companyId, reset, getDefaultValues, clearErrors]);

  // Effect to handle store type validation after initial check
  useEffect(() => {
    if (isEditing || !initialCheckComplete) return;

    // If central store exists and user tries to select it, show error and prevent selection
    if (centralStoreExists && watchedStoreType === "Central Store") {
      setError("type", {
        type: "manual",
        message: "Only one Central Store is allowed in the system. A Central Store already exists.",
      });
      // Force change to Branch Store
      setValue("type", "Branch Store");
    } else {
      clearErrors("type");
    }

    // Clear parent_id for Central Store
    if (watchedStoreType === "Central Store") {
      setValue("parent_id", "");
      clearErrors("parent_id");
    }
  }, [watchedStoreType, centralStoreExists, isEditing, initialCheckComplete, setValue, setError, clearErrors]);

  // Store ID validation function
  const validateStoreIdUniqueness = useCallback(async (storeCode: string) => {
    if (!storeCode || storeCode.length !== 6 || !companyId) {
      return;
    }

    // Skip validation for editing mode with the same store code
    if (isEditing && store && store.code === storeCode) {
      setStoreIdValidationStatus('valid');
      setStoreIdValidationMessage('Current store ID');
      clearErrors('code');
      return;
    }

    setStoreIdValidationStatus('validating');
    setStoreIdValidationMessage('Checking availability...');

    try {
      // Use storeService to check if store code exists
      const response = await storeService.listStores({ search: storeCode });
      
      // The apiClient will throw an error if the response is not ok, so we don't need to check for errors here
      const data = response.data;
      
      // Check if any store in the response has the same code (case-sensitive comparison)
      const exists = data && data.some(store => store.code === storeCode);

      if (exists) {
        setStoreIdValidationStatus('invalid');
        setStoreIdValidationMessage('Store ID already exists');
        setError("code", {
          type: "manual",
          message: "This store ID is already in use",
        });
      } else {
        setStoreIdValidationStatus('valid');
        setStoreIdValidationMessage('Store ID is available');
        clearErrors('code');
      }
    } catch (error) {
      console.error("Error during store ID validation:", error);
      setStoreIdValidationStatus('idle');
      setStoreIdValidationMessage('');
    } finally {
      // Validation complete - status is already set above
    }
  }, [companyId, isEditing, store, setError, clearErrors]);

  // Debounced store ID validation
  useEffect(() => {
    // Clear existing timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Reset validation state when store code changes
    if (watchedStoreCode && watchedStoreCode.length > 0) {
      setStoreIdValidationStatus('idle');
      setStoreIdValidationMessage('');
    }

    // Only validate if we have a complete store code (6 characters)
    if (watchedStoreCode && watchedStoreCode.length === 6 && !isEditing) {
      validationTimeoutRef.current = setTimeout(() => {
        validateStoreIdUniqueness(watchedStoreCode);
      }, 500); // 500ms debounce
    }

    // Cleanup timeout on unmount
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [watchedStoreCode, validateStoreIdUniqueness, isEditing]);

  // Load store data if editing
  useEffect(() => {
    if (!id || !companyId) {
      if (!isEditing && companyId) {
        checkCentralStoreExists();
      }
      return;
    }

    setIsLoadingStore(true);
    const loadStore = async () => {
      try {
        // Use storeService to fetch store data
        const response = await storeService.getStore(id);
        
        // The apiClient will throw an error if the response is not ok, so we don't need to check for errors here
        const data = response.data;
        setStore(data as any as IStore); // Type assertion to match the existing IStore type
        
        if (data) {
          const validTypes = ["Central Store", "Branch Store"] as const;
          const storeType = validTypes.includes(data.type) ? data.type : "Branch Store";

          reset({
            code: data.code || "",
            name: data.name || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            postalCode: data.postalCode || "",
            country: data.country || "",
            phone: data.phone || "",
            email: data.email || "",
            type: storeType,
            parent_id: data.parent?._id ? String(data.parent._id) : "",
            bank_name: data.bankName || "",
            bank_account_number: data.bankAccountNumber || "",
            bank_ifsc_code: data.ifscCode || "",
            bank_iban_code: data.ibanCode || "",
            tax_code: data.taxCode || "",
            store_manager_id: data.manager?._id ? String(data.manager._id) : "",
            direct_purchase_allowed: data.directPurchaseAllowed || false,
          });
        }
      } catch (error: any) {
        console.error("Error loading store:", error);
        toast.error(error.message || "Failed to load store data", { position: "top-right" });
      } finally {
        setIsLoadingStore(false);
      }
    };
    loadStore();
  }, [id, reset, companyId, checkCentralStoreExists, isEditing]);

  // Load parent stores - show all stores (both Central and Branch) when creating Branch Store
  useEffect(() => {
    const loadParentStores = async () => {
      if (!companyId) return;
      try {
        // Use storeService to fetch all stores (both Central and Branch)
        const response = await storeService.listStores();
        
        // The apiClient will throw an error if the response is not ok, so we don't need to check for errors here
        let filteredStores = response.data || [];
        
        if (isEditing && store) {
          // Filter out the current store from the parent store list
          filteredStores = filteredStores.filter(
            (parent) => parent._id !== (store as any)._id
          );
        }
        
        // Convert to IStore type for compatibility with existing code
        const convertedStores = filteredStores.map(store => ({
          id: store._id,
          ...store
        })) as unknown as IStore[];
        
        setParentStores(convertedStores);
      } catch (error) {
        console.error("Error loading parent stores:", error);
      }
    };

    loadParentStores();
  }, [isEditing, store, companyId]);

  // Load store managers
// Load store managers
useEffect(() => {
  const loadManagers = async () => {
    if (!companyId) return;
    try {
      // 1. Fetch ALL active users (the API does not have a role filter)
      const response = await userService.list({
        status: 'active',
        limit: 1000,
      });
      let usersData = response.data || [];

      const adminUsers = usersData.filter(
        (user) =>
          user.role?.toLowerCase() === 'admin'          // <-- if role is a string like "admin"
                );

      // 3. If we are editing, also include the current manager even if he is not admin
      // Note: The manager property may not be available in the current IStore interface
      // We'll skip this logic for now to avoid TypeScript errors
      // if (isEditing && id && store?.manager) {
      //   const currentManagerId =
      //     typeof store.manager === 'object' && store.manager !== null
      //       ? (store.manager as any)._id
      //       : store.manager;

      //   if (currentManagerId) {
      //     const alreadyIncluded = adminUsers.some(
      //       (u) => u.id === currentManagerId || u.id === String(currentManagerId)
      //     );

      //     if (!alreadyIncluded) {
      //       try {
      //         const managerResponse = await userService.get(String(currentManagerId));
      //         if (managerResponse.data) {
      //           adminUsers = [...adminUsers, managerResponse.data];
      //         }
      //       } catch (error) {
      //         console.warn('Could not fetch current store manager:', error);
      //       }
      //     }
      //   }
      // }

      const mappedManagers: ExtendedUser[] = adminUsers.map((user) => ({
        id: user.id,
        first_name: user.firstName,
        last_name: user.lastName,
        email: user.email,
        phone: user.phone || '',
        role_id: user.role || '',
        status: user.status,
        is_active: user.isActive,
        company_id: companyId,
        created_at: user.createdAt,
        last_sign_in: user.lastLoginAt || '',
        email_confirmed: true,
        full_name: `${user.firstName} ${user.lastName}`,
        role: {
          id: user.role || '',
          role_name: user.role || 'No Role',
        },
      }));

      setManagers(mappedManagers);
    } catch (error) {
      console.error('Error loading managers:', error);
      toast.error('Failed to load store managers.', { position: 'top-right' });
      setManagers([]);
    }
  };

  loadManagers();
}, [companyId, id, isEditing, store]);

  // Handle form submission
  const onSubmit = async (data: StoreFormData) => {
    setFormError(null);

    if (!companyId) {
      setFormError("Company ID is missing. Please log in again.");
      toast.error("Company ID is missing. Please log in again.", {
        position: "top-right",
      });
      navigate("/login");
      return;
    }

    // Prevent submission if store ID validation is still in progress or invalid
    if (!isEditing && storeIdValidationStatus === 'validating') {
      setFormError("Please wait for store ID validation to complete.");
      return;
    }

    if (!isEditing && storeIdValidationStatus === 'invalid') {
      setError("code", {
        type: "manual",
        message: "Please choose a different store ID",
      });
      setFormError("Please correct the highlighted errors before saving.");
      return;
    }

    if (data.type === "Central Store" && !isEditing && centralStoreExists) {
      setError("type", {
        type: "manual",
        message: "Only one Central Store is allowed in the system. A Central Store already exists.",
      });
      setFormError("Please correct the highlighted errors before saving.");
      return;
    }

    // Map form fields to database columns and remove form-specific fields
    const cleanedData: any = {
      name: data.name?.trim(),
      code: data.code?.trim(),
      type: data.type,
      // Address fields
      address: data.address?.trim(),
      city: data.city?.trim(),
      state: data.state?.trim(),
      postalCode: data.postalCode?.trim(),
      country: data.country?.trim(),
      // Financial fields
      bankName: data.bank_name?.trim(),
      bankAccountNumber: data.bank_account_number?.trim(),
      ifscCode: data.bank_ifsc_code?.trim(),
      ibanCode: data.bank_iban_code?.trim(),
      // Tax field
      taxCode: data.tax_code?.trim(),
      // Configuration field
      directPurchaseAllowed: data.direct_purchase_allowed || false,
    };

    // Handle parentId - only include if Branch Store and has a valid parent
    if (data.type === "Branch Store" && data.parent_id && data.parent_id.trim() !== "") {
      cleanedData.parentId = data.parent_id.trim();
    }
    // For Central Store, don't include parentId at all (backend expects it to be omitted)

    // Handle managerId - only include if provided and not empty
    if (data.store_manager_id && data.store_manager_id.trim() !== "") {
      cleanedData.managerId = data.store_manager_id.trim();
    }

    // Optional fields - only include if they have values
    if (data.phone && data.phone.trim() !== "") {
      cleanedData.phone = data.phone.trim();
    }
    if (data.email && data.email.trim() !== "") {
      cleanedData.email = data.email.trim().toLowerCase();
    }

    try {
      if (isEditing) {
        // Update existing store using the storeService
        const response = await storeService.updateStore(id!, cleanedData);
        // If we reach here, the request was successful
        toast.success("Store updated successfully", { position: "top-right" });
      } else {
        // Create new store using the storeService
        const response = await storeService.createStore(cleanedData);
        // If we reach here, the request was successful
        toast.success("Store created successfully", { position: "top-right" });
      }
      navigate("/dashboard/storeManagement");
    } catch (error: any) {
      console.error("API error:", error);
      
      let errorMessage = `Failed to ${isEditing ? "update" : "create"} store`;
      
      // Handle specific error cases
      if (error.message) {
        if (error.message.toLowerCase().includes("code")) {
          errorMessage = "Store id already exists. Please use a different code.";
          setError("code", {
            type: "manual",
            message: "This store id is already in use",
          });
        } else if (error.message.toLowerCase().includes("email")) {
          errorMessage = "Email address already exists. Please use a different email.";
          setError("email", {
            type: "manual",
            message: "This email is already in use",
          });
        } else if (error.message.toLowerCase().includes("central store") && data.type === "Central Store") {
          setError("type", {
            type: "manual",
            message: "Only one Central Store is allowed in the system.",
          });
          errorMessage = "Only one Central Store is allowed in the system.";
          checkCentralStoreExists();
        } else {
          errorMessage = error.message;
        }
      }

      toast.error(errorMessage, { position: "top-right" });
      setFormError("Please correct the highlighted errors before saving.");

      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField && formRef.current) {
        const invalidElement = formRef.current.querySelector(
          `[name="${firstErrorField}"]`
        );
        if (invalidElement) {
          invalidElement.scrollIntoView({ behavior: "smooth", block: "center" });
          (invalidElement as HTMLElement).focus();
        }
      }
    }
  };

  const handleCancel = () => {
    reset(getDefaultValues());
    navigate("/dashboard/storeManagement");
  };

  const ErrorMessage = ({ message }: { message?: string }) => {
    if (!message) return null;
    return (
      <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
        <AlertCircle className="h-3 w-3" />
        {message}
      </p>
    );
  };

  // UI Control Logic
  const isStoreTypeDisabled = isEditing;
  const isCentralStoreDisabled = !isEditing && centralStoreExists;
  const isBranchStoreDisabled = !isEditing && (!centralStoreExists || isCheckingCentralStore);
  const isParentStoreDisabled =
    isEditing && store
      ? watchedStoreType === "Central Store"
      : isCheckingCentralStore || watchedStoreType === "Central Store";

  return (
    <>
      {isCheckingCentralStore && !isEditing ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <div className="text-lg text-gray-600">
              Checking store configuration...
            </div>
          </div>
        </div>
      ) : isEditing && isLoadingStore ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <div className="text-lg text-gray-600">Loading store data...</div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-gray-50 min-h-screen">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard/storeManagement")}
                className="hover:bg-blue-100 transition-colors duration-200 rounded-full"
              >
                <ArrowLeft className="h-5 w-5 text-blue-600" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Store className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isEditing ? "Update Store" : "Add New Store"}
                  </h1>
                  <p className="text-gray-600">
                    {isEditing
                      ? "Update store information and settings"
                      : "Create a new store location for your inventory management"}
                  </p>
                </div>
              </div>
            </div>

            {/* Form Error Display */}
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                <p className="text-red-700">{formError}</p>
              </div>
            )}

            {/* Form Card */}
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl text-blue-800">
                  Store Information
                </CardTitle>
                <CardDescription className="text-blue-600">
                  Fill in the store details below to{" "}
                  {isEditing ? "update the existing" : "create a new"} store
                  location. Fields marked with <span className="text-red-500">*</span> are required.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6 p-6">
                <form
                  ref={formRef}
                  onSubmit={handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  {/* Basic Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <Store className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="code"
                          className={`${errors.code ? "text-red-500" : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                        >
                          <Store className="h-4 w-4" /> Store Id <span className="text-red-500">*</span>
                        </Label>
                        <Controller
                          name="code"
                          control={control}
                          render={({ field }) => (
                            <div className="relative">
                              <Input
                                {...field}
                                id="code"
                                placeholder="Enter 6-character store id"
                                maxLength={6}
                                className={`${errors.code
                                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                  : storeIdValidationStatus === 'valid'
                                    ? "border-green-300 focus:border-green-500 focus:ring-green-200"
                                    : storeIdValidationStatus === 'invalid'
                                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                      : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                  } pl-3 pr-10 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${field.value ? "border-blue-300" : ""
                                  }`}
                                disabled={isEditing}
                              />
                              {/* Validation Status Icon */}
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                {storeIdValidationStatus === 'validating' && (
                                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                )}
                                {storeIdValidationStatus === 'valid' && (
                                  <Check className="h-4 w-4 text-green-500" />
                                )}
                                {storeIdValidationStatus === 'invalid' && (
                                  <X className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </div>
                          )}
                        />
                        <ErrorMessage message={errors.code?.message} />
                        {/* Validation Status Message */}
                        {storeIdValidationMessage && !errors.code && (
                          <p className={`text-sm flex items-center gap-1 mt-1 ${storeIdValidationStatus === 'valid'
                              ? 'text-green-600'
                              : storeIdValidationStatus === 'invalid'
                                ? 'text-red-500'
                                : 'text-blue-500'
                            }`}>
                            {storeIdValidationStatus === 'valid' && <Check className="h-3 w-3" />}
                            {storeIdValidationStatus === 'invalid' && <X className="h-3 w-3" />}
                            {storeIdValidationStatus === 'validating' && <Loader2 className="h-3 w-3 animate-spin" />}
                            {storeIdValidationMessage}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="name"
                          className={`${errors.name ? "text-red-500" : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                        >
                          <Store className="h-4 w-4" /> Store Name <span className="text-red-500">*</span>
                        </Label>
                        <Controller
                          name="name"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="name"
                              placeholder="Enter store name"
                              maxLength={100}
                              className={`${errors.name
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${field.value ? "border-blue-300" : ""
                                }`}
                            />
                          )}
                        />
                        <ErrorMessage message={errors.name?.message} />
                      </div>
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="phone"
                          className={`${errors.phone ? "text-red-500" : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                        >
                          <Phone className="h-4 w-4" /> Phone Number <span className="text-red-500">*</span>
                        </Label>
                        <Controller
                          name="phone"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="phone"
                              placeholder="Enter phone number"
                              maxLength={20}
                              className={`${errors.phone
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${field.value ? "border-blue-300" : ""
                                }`}
                            />
                          )}
                        />
                        <ErrorMessage message={errors.phone?.message} />
                      </div>
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="email"
                          className={`${errors.email ? "text-red-500" : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                        >
                          <Mail className="h-4 w-4" /> Email Address <span className="text-red-500">*</span>
                        </Label>
                        <Controller
                          name="email"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="email"
                              type="email"
                              placeholder="Enter email address"
                              className={`${errors.email
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${field.value ? "border-blue-300" : ""
                                }`}
                            />
                          )}
                        />
                        <ErrorMessage message={errors.email?.message} />
                      </div>
                    </div>
                  </div>

                  {/* Address Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <MapPin className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-800">Address Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 group md:col-span-2">
                        <Label
                          htmlFor="address"
                          className={`${errors.address ? "text-red-500" : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                        >
                          <MapPin className="h-4 w-4" /> Street Address <span className="text-red-500">*</span>
                        </Label>
                        <Controller
                          name="address"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="address"
                              placeholder="Enter street address"
                              className={`${errors.address
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 ${field.value ? "border-blue-300" : ""
                                }`}
                            />
                          )}
                        />
                        <ErrorMessage message={errors.address?.message} />
                      </div>
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="city"
                          className={`${errors.city ? "text-red-500" : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 font-medium`}
                        >
                          City <span className="text-red-500">*</span>
                        </Label>
                        <Controller
                          name="city"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="city"
                              placeholder="Enter city"
                              className={`${errors.city
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 ${field.value ? "border-blue-300" : ""
                                }`}
                            />
                          )}
                        />
                        <ErrorMessage message={errors.city?.message} />
                      </div>
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="state"
                          className={`${errors.state ? "text-red-500" : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 font-medium`}
                        >
                          State/Province <span className="text-red-500">*</span>
                        </Label>
                        <Controller
                          name="state"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="state"
                              placeholder="Enter state"
                              className={`${errors.state
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 ${field.value ? "border-blue-300" : ""
                                }`}
                            />
                          )}
                        />
                        <ErrorMessage message={errors.state?.message} />
                      </div>
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="postalCode"
                          className={`${errors.postalCode ? "text-red-500" : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 font-medium`}
                        >
                          Postal Code <span className="text-red-500">*</span>
                        </Label>
                        <Controller
                          name="postalCode"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="postalCode"
                              placeholder="Enter postal code"
                              className={`${errors.postalCode
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 ${field.value ? "border-blue-300" : ""
                                }`}
                            />
                          )}
                        />
                        <ErrorMessage message={errors.postalCode?.message} />
                      </div>
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="country"
                          className={`${errors.country ? "text-red-500" : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 font-medium`}
                        >
                          Country <span className="text-red-500">*</span>
                        </Label>
                        <Controller
                          name="country"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="country"
                              placeholder="Enter country"
                              className={`${errors.country
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 ${field.value ? "border-blue-300" : ""
                                }`}
                            />
                          )}
                        />
                        <ErrorMessage message={errors.country?.message} />
                      </div>
                    </div>
                  </div>

                  {/* Store Configuration Section */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Store Configuration
                    </h3>
                    <div className="grid grid-cols-3 gap-4 items-start">
                      <div className="space-y-2">
                        <Label className="text-gray-700 flex items-center gap-1 font-medium">
                          <Store className="h-4 w-4" /> Store Type <span className="text-red-500">*</span>
                        </Label>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Controller
                              name="type"
                              control={control}
                              render={({ field }) => (
                                <input
                                  type="radio"
                                  id="centralStore"
                                  value="Central Store"
                                  checked={field.value === "Central Store"}
                                  onChange={() => field.onChange("Central Store")}
                                  disabled={isStoreTypeDisabled || isCentralStoreDisabled}
                                  className="h-4 w-4"
                                />
                              )}
                            />
                            <Label htmlFor="centralStore" className="text-sm">Central Store</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Controller
                              name="type"
                              control={control}
                              render={({ field }) => (
                                <input
                                  type="radio"
                                  id="branchStore"
                                  value="Branch Store"
                                  checked={field.value === "Branch Store"}
                                  onChange={() => field.onChange("Branch Store")}
                                  disabled={isStoreTypeDisabled || isBranchStoreDisabled}
                                  className="h-4 w-4"
                                />
                              )}
                            />
                            <Label htmlFor="branchStore" className="text-sm">Branch Store</Label>
                          </div>
                        </div>
                        <ErrorMessage message={errors.type?.message} />
                        {isStoreTypeDisabled && (
                          <p className="text-sm text-gray-500">
                            Central and Branch Store type cannot be changed
                          </p>
                        )}
                        {isCentralStoreDisabled && !isEditing && (
                          <p className="text-sm text-gray-500">
                            Only Branch Store can be created as a Central Store already exists
                          </p>
                        )}
                      </div>
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="parent_id"
                          className={`${errors.parent_id ? "text-red-500" : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                        >
                          <Store className="h-4 w-4" /> Parent Store{" "}
                          {watchedStoreType === "Branch Store" ? <span className="text-red-500">*</span> : ""}
                        </Label>
                        <Controller
                          name="parent_id"
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value || ""}
                              onValueChange={field.onChange}
                              disabled={isParentStoreDisabled}
                            >
                              <SelectTrigger
                                className={`${errors.parent_id
                                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                  : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                  } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${field.value ? "border-blue-300" : ""
                                  }`}
                              >
                                <SelectValue placeholder="Select parent store" />
                              </SelectTrigger>
                              <SelectContent>
                                {parentStores?.map((parentStore: IStore) => (
                                  <SelectItem
                                    key={parentStore.id}
                                    value={parentStore.id}
                                  >
                                    {parentStore.name} ({parentStore.type})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <ErrorMessage message={errors.parent_id?.message} />
                      </div>
                      <div className="flex items-center pt-6">
                        <div className="flex items-center space-x-2">
                          <Controller
                            name="direct_purchase_allowed"
                            control={control}
                            render={({ field }) => (
                              <Checkbox
                                id="directPurchase"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            )}
                          />
                          <Label htmlFor="directPurchase">
                            Direct Purchase Allowed
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Financial Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <CreditCard className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-800">Financial Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="bank_name"
                          className={`${errors.bank_name ? "text-red-500" : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                        >
                          <CreditCard className="h-4 w-4" /> Bank Name
                        </Label>
                        <Controller
                          name="bank_name"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="bank_name"
                              placeholder="Enter bank name"
                              maxLength={100}
                              className={`${errors.bank_name
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${field.value ? "border-blue-300" : ""
                                }`}
                            />
                          )}
                        />
                        <ErrorMessage message={errors.bank_name?.message} />
                      </div>
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="bank_account_number"
                          className={`${errors.bank_account_number
                            ? "text-red-500"
                            : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                        >
                          <CreditCard className="h-4 w-4" /> Bank Account #
                        </Label>
                        <Controller
                          name="bank_account_number"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="bank_account_number"
                              placeholder="Enter account number"
                              maxLength={50}
                              className={`${errors.bank_account_number
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${field.value ? "border-blue-300" : ""
                                }`}
                            />
                          )}
                        />
                        <ErrorMessage
                          message={errors.bank_account_number?.message}
                        />
                      </div>
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="bank_ifsc_code"
                          className={`${errors.bank_ifsc_code
                            ? "text-red-500"
                            : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                        >
                          <CreditCard className="h-4 w-4" /> IFSC Code
                        </Label>
                        <Controller
                          name="bank_ifsc_code"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="bank_ifsc_code"
                              placeholder="Enter IFSC code"
                              maxLength={20}
                              className={`${errors.bank_ifsc_code
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${field.value ? "border-blue-300" : ""
                                }`}
                              onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                              }
                            />
                          )}
                        />
                        <p className="text-sm text-gray-500">
                          Required for suppliers with Indian bank accounts.
                        </p>
                        <ErrorMessage message={errors.bank_ifsc_code?.message} />
                      </div>
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="bank_iban_code"
                          className={`${errors.bank_iban_code
                            ? "text-red-500"
                            : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                        >
                          <CreditCard className="h-4 w-4" /> IBAN Code
                        </Label>
                        <Controller
                          name="bank_iban_code"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="bank_iban_code"
                              placeholder="Enter IBAN code"
                              maxLength={34}
                              className={`${errors.bank_iban_code
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${field.value ? "border-blue-300" : ""
                                }`}
                              onChange={(e) =>
                                field.onChange(e.target.value.toUpperCase())
                              }
                            />
                          )}
                        />
                        <p className="text-sm text-gray-500">
                          Required for international bank accounts outside India.
                        </p>
                        <ErrorMessage
                          message={errors.bank_iban_code?.message}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Information Section */}
                  <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                      <User className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-800">Additional Information</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="tax_code"
                          className={`${errors.tax_code ? "text-red-500" : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                        >
                          <CreditCard className="h-4 w-4" /> Tax Code <span className="text-red-500">*</span>
                        </Label>
                        <Controller
                          name="tax_code"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="tax_code"
                              placeholder="Enter tax code"
                              maxLength={50}
                              className={`${errors.tax_code
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${field.value ? "border-blue-300" : ""
                                }`}
                            />
                          )}
                        />
                        <ErrorMessage message={errors.tax_code?.message} />
                      </div>
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="store_manager_id"
                          className={`${errors.store_manager_id
                            ? "text-red-500"
                            : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                        >
                          <User className="h-4 w-4" /> Store Admin <span className="text-red-500">*</span>
                        </Label>
                        <Controller
                          name="store_manager_id"
                          control={control}
                          render={({ field }) => (
                            <Select
                              value={field.value || ""}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger
                                className={`${errors.store_manager_id
                                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                  : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                  } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${field.value ? "border-blue-300" : ""
                                  }`}
                              >
                                <SelectValue placeholder="Select store manager" />
                              </SelectTrigger>
                              <SelectContent>
                                {managers.length === 0 ? (
                                  <p className="text-sm text-gray-500 px-2 py-1">
                                    No store managers found
                                  </p>
                                ) : (
                                  managers.map((manager: ExtendedUser) => (
                                    <SelectItem
                                      key={manager.id}
                                      value={manager.id}
                                    >
                                      {manager.full_name || `${manager.first_name || ''} ${manager.last_name || ''}`.trim() || manager.email}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <ErrorMessage message={errors.store_manager_id?.message} />
                      </div>
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="pt-6 border-t flex justify-end gap-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                      disabled={isSubmitting}
                      className="border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors duration-200 px-6 py-2"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg px-6 py-2"
                    >
                      {isSubmitting ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {isEditing ? "Updating..." : "Creating..."}
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          {isEditing ? "Update Store" : "Create Store"}
                        </span>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}