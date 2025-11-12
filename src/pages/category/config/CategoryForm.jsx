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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, CheckCircle, Loader2, Tag, AlertCircle, Check, X } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/Utils/types/supabaseClient";
import { getLocalDateTime } from "@/Utils/commonFun";

// Validation schema for the category form
const createCategorySchema = (isEditing, currentCategoryName) =>
  z.object({
    name: z
      .string()
      .min(1, "Category name is required")
      .max(100, "Category name cannot exceed 100 characters")
      .trim()
      .refine(
        async (value) => {
          // Skip validation if editing and the name hasn't changed
          if (isEditing && currentCategoryName && value.toLowerCase() === currentCategoryName.toLowerCase()) {
            return true;
          }
          return true; // We'll handle uniqueness validation separately
        }
      ),
    description: z
      .string()
      .max(500, "Description cannot exceed 500 characters")
      .optional()
      .or(z.literal("")),
    status: z.boolean(),
  });

const CategoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [category, setCategory] = useState(null);
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);
  const [companyId, setCompanyId] = useState(null);
  const [userId, setUserId] = useState(null);

  const formRef = useRef(null);
  
  // Category name validation state
  const [nameValidationStatus, setNameValidationStatus] = useState('idle');
  const [nameValidationMessage, setNameValidationMessage] = useState('');
  const validationTimeoutRef = useRef(null);

  const isEditing = Boolean(id);

  // Get default values
  const getDefaultValues = useCallback(() => ({
    name: "",
    description: "",
    status: true,
  }), []);

  // Create schema with current state
  const categorySchema = createCategorySchema(isEditing, category?.name);

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(categorySchema),
    defaultValues: getDefaultValues(),
  });

  const watchedCategoryName = watch("name");

  // Fetch company_id from local storage on component mount
  useEffect(() => {
    try {
      const userDataString = localStorage.getItem("userData");
      if (userDataString) {
        const userData = JSON.parse(userDataString);
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
        position: "top-center",
      });
      navigate("/login");
    }
  }, [navigate]);

  // Category name validation function
  const validateCategoryNameUniqueness = useCallback(async (categoryName) => {
    if (!categoryName || !companyId) {
      return;
    }

    // Skip validation for editing mode with the same category name
    if (isEditing && category && category.name.toLowerCase() === categoryName.toLowerCase()) {
      setNameValidationStatus('valid');
      setNameValidationMessage('Current category name');
      clearErrors('name');
      return;
    }

    setNameValidationStatus('validating');
    setNameValidationMessage('Checking availability...');

    try {
      const { data, error } = await supabase
        .from("category_master")
        .select("id, name")
        .eq('company_id', companyId)
        .eq('is_active', true)
        .ilike("name", categoryName) // Case-insensitive comparison
        .limit(1);

      if (error) {
        console.error("Error validating category name:", error);
        setNameValidationStatus('idle');
        setNameValidationMessage('');
        return;
      }

      const exists = data && data.length > 0;
      
      if (exists) {
        setNameValidationStatus('invalid');
        setNameValidationMessage('Category name already exists');
        setError("name", {
          type: "manual",
          message: "This category name is already in use",
        });
      } else {
        setNameValidationStatus('valid');
        setNameValidationMessage('Category name is available');
        clearErrors('name');
      }
    } catch (error) {
      console.error("Error during category name validation:", error);
      setNameValidationStatus('idle');
      setNameValidationMessage('');
    }
  }, [companyId, isEditing, category, setError, clearErrors]);

  // Debounced category name validation
  useEffect(() => {
    // Clear existing timeout
    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    // Reset validation state when category name changes
    if (watchedCategoryName && watchedCategoryName.length > 0) {
      setNameValidationStatus('idle');
      setNameValidationMessage('');
    }

    // Only validate if we have a category name
    if (watchedCategoryName && watchedCategoryName.trim().length > 0) {
      validationTimeoutRef.current = setTimeout(() => {
        validateCategoryNameUniqueness(watchedCategoryName.trim());
      }, 500); // 500ms debounce
    }

    // Cleanup timeout on unmount
    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [watchedCategoryName, validateCategoryNameUniqueness]);

  // Load category data if editing
  useEffect(() => {
    if (!id || !companyId) return;

    setIsLoadingCategory(true);
    const loadCategory = async () => {
      try {
        const { data, error } = await supabase
          .from("category_master")
          .select("*")
          .eq("id", id)
          .eq("company_id", companyId)
          .single();

        if (error) throw error;

        setCategory(data);
        if (data) {
          reset({
            name: data.name || "",
            description: data.description || "",
            status: data.status ?? true,
          });
        }
      } catch (error) {
        console.error("Error loading category:", error);
        toast.error("Failed to load category data", { position: "top-center" });
      } finally {
        setIsLoadingCategory(false);
      }
    };
    loadCategory();
  }, [id, reset, companyId, navigate]);

  // Check if category can be deleted/deactivated (not linked to any items)
  const checkCategoryUsage = async (categoryId) => {
    try {
      const { data, error } = await supabase
        .from("item_mgmt")
        .select("id")
        .eq("category_id", categoryId)
        .eq("status", true)
        .limit(1);

      if (error) throw error;
      
      return data && data.length > 0;
    } catch (error) {
      console.error("Error checking category usage:", error);
      return false;
    }
  };

  // Handle form submission
  const onSubmit = async (data) => {

    if (!companyId) {
      toast.error("Company ID is missing. Please log in again.", {
        position: "top-center",
      });
      navigate("/login");
      return;
    }


    if (nameValidationStatus === 'invalid') {
      setError("name", {
        type: "manual",
        message: "Please choose a different category name",
      });
      return;
    }

    // Check if category is being deactivated and has linked items
    if (isEditing && data.status === false && category?.status === true) {
      const hasLinkedItems = await checkCategoryUsage(id);
      if (hasLinkedItems) {
        toast.error("Cannot deactivate category. Items are associated with this category.", {
          position: "top-center",
        });
        return;
      }
    }

    // Prepare data for database
    const cleanedData = {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      status: data.status, 
      company_id: companyId,
    };

    try {
      if (isEditing) {
        const { error } = await supabase
          .from("category_master")
          .update({
            ...cleanedData,
            modified_at: getLocalDateTime(),
          })
          .eq("id", id)
          .eq("company_id", companyId);

        if (error) throw error;

        // Creating system log
        const systemLogs = {
          company_id: companyId,
          transaction_date: new Date().toISOString(),
          module: 'Category Master',
          scope: 'Edit',
          key: '',
          log: `Category: ${data.name} updated.`,
          action_by: userId,
          created_at: new Date().toISOString(),
        }

        const { error: systemLogError } = await supabase
          .from('system_log')
          .insert(systemLogs);

        if (systemLogError) throw systemLogError;
        toast.success("Category updated successfully", { position: "top-center" });
      } else {
        const { error } = await supabase.from("category_master").insert([
          {
            ...cleanedData,
            created_at: getLocalDateTime(),
            modified_at: getLocalDateTime(),
          },
        ]);

        if (error) throw error;

        // Creating system log
        const systemLogs = {
          company_id: companyId,
          transaction_date: new Date().toISOString(),
          module: 'Category Master',
          scope: 'Add',
          key: '',
          log: `Category: ${data.name} created.`,
          action_by: userId,
          created_at: new Date().toISOString(),
        }

        const { error: systemLogError } = await supabase
          .from('system_log')
          .insert(systemLogs);

        if (systemLogError) throw systemLogError;
        toast.success("Category created successfully", { position: "top-center" });
      }
      navigate("/dashboard/category-master");
    } catch (error) {
      console.error("Database error:", error);

      let errorMessage = `Failed to ${isEditing ? "update" : "create"} category`;

      if (error.code === "23505") {
        if (error.message.includes("name")) {
          errorMessage = "Category name already exists. Please use a different name.";
          setError("name", {
            type: "manual",
            message: "This category name is already in use",
          });
        }
      }

      toast.error(errorMessage, { position: "top-center" });

      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField && formRef.current) {
        const invalidElement = formRef.current.querySelector(
          `[name="${firstErrorField}"]`
        );
        if (invalidElement) {
          invalidElement.scrollIntoView({ behavior: "smooth", block: "center" });
          invalidElement.focus();
        }
      }
    }
  };
  const handleCancel = () => {
    reset(getDefaultValues());
    navigate("/dashboard/category-master");
  };

  const ErrorMessage = ({ message }) => {
    if (!message) return null;
    return (
      <p className="text-sm text-red-500 flex items-center gap-1 mt-1">
        <AlertCircle className="h-3 w-3" />
        {message}
      </p>
    );
  };

  return (
    <>
      {isEditing && isLoadingCategory ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <div className="text-lg text-gray-600">Loading category data...</div>
          </div>
        </div>
      ) : (
        <div className="p-6 bg-gray-50 min-h-screen">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Header Section */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/dashboard/category-master")}
                className="hover:bg-blue-100 transition-colors duration-200 rounded-full"
              >
                <ArrowLeft className="h-5 w-5 text-blue-600" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-lg bg-blue-100">
                  <Tag className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">
                    {isEditing ? "Update Category" : "Add New Category"}
                  </h1>
                  <p className="text-gray-600">
                    {isEditing
                      ? "Update category information and settings"
                      : "Create a new category for inventory item classification"}
                  </p>
                </div>
              </div>
            </div>


            {/* Form Card */}
            <Card className="border-none shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl text-blue-800">
                  Category Information
                </CardTitle>
                <CardDescription className="text-blue-600">
                  Fill in the category details below to{" "}
                  {isEditing ? "update the existing" : "create a new"} category.
                  Fields marked with <span className="text-red-500">*</span> are required.
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
                      <Tag className="h-5 w-5 text-blue-600" />
                      <h3 className="text-lg font-semibold text-gray-800">Basic Information</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                      <div className="space-y-2 group">
                        <Label
                          htmlFor="name"
                          className={`${errors.name ? "text-red-500" : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                        >
                          <Tag className="h-4 w-4" /> Category Name <span className="text-red-500">*</span> 
                        </Label>
                        <Controller
                          name="name"
                          control={control}
                          render={({ field }) => (
                            <div className="relative">
                              <Input
                                {...field}
                                id="name"
                                placeholder="Enter category name"
                                maxLength={100}
                                className={`${errors.name
                                  ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                  : nameValidationStatus === 'valid'
                                    ? "border-green-300 focus:border-green-500 focus:ring-green-200"
                                    : nameValidationStatus === 'invalid'
                                      ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                      : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                  } pl-3 pr-10 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${field.value ? "border-blue-300" : ""
                                  }`}
                              />
                              {/* Validation Status Icon */}
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                {nameValidationStatus === 'validating' && (
                                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                                )}
                                {nameValidationStatus === 'valid' && (
                                  <Check className="h-4 w-4 text-green-500" />
                                )}
                                {nameValidationStatus === 'invalid' && (
                                  <X className="h-4 w-4 text-red-500" />
                                )}
                              </div>
                            </div>
                          )}
                        />
                        <ErrorMessage message={errors.name?.message} />
                        {/* Validation Status Message */}
                        {nameValidationMessage && !errors.name && (
                          <p className={`text-sm flex items-center gap-1 mt-1 ${
                            nameValidationStatus === 'valid' 
                              ? 'text-green-600' 
                              : nameValidationStatus === 'invalid'
                                ? 'text-red-500'
                                : 'text-blue-500'
                          }`}>
                            {nameValidationStatus === 'valid' && <Check className="h-3 w-3" />}
                            {nameValidationStatus === 'invalid' && <X className="h-3 w-3" />}
                            {nameValidationStatus === 'validating' && <Loader2 className="h-3 w-3 animate-spin" />}
                            {nameValidationMessage}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2 group">
                        <Label
                          htmlFor="description"
                          className={`${errors.description ? "text-red-500" : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                        >
                          <Tag className="h-4 w-4" /> Description
                        </Label>
                        <Controller
                          name="description"
                          control={control}
                          render={({ field }) => (
                            <Textarea
                              {...field}
                              id="description"
                              placeholder="Enter category description (optional)"
                              maxLength={500}
                              rows={4}
                              className={`${errors.description
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full resize-none ${field.value ? "border-blue-300" : ""
                                }`}
                            />
                          )}
                        />
                        <ErrorMessage message={errors.description?.message} />
                        <p className="text-sm text-gray-500">
                          Optional description to help identify the category's purpose
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-gray-700 font-medium">Status</Label>
                        <div className="flex items-center space-x-2">
                          <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                              <Checkbox
                                id="status"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            )}
                          />
                          <Label htmlFor="status" className="text-sm">
                            Active (Category can be used for new items)
                          </Label>
                        </div>
                        <p className="text-sm text-gray-500">
                          Inactive categories cannot be selected when creating new items, but existing items will retain their category
                        </p>
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
                          {isEditing ? "Update Category" : "Create Category"}
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

export default CategoryForm;

