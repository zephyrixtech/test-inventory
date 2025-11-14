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
import { ArrowLeft, CheckCircle, Loader2, Tag, AlertCircle } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import toast from "react-hot-toast";
import { categoryService } from "@/services/categoryService";

// Validation schema for the category form
const createCategorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name cannot exceed 100 characters")
    .trim(),
  description: z
    .string()
    .max(500, "Description cannot exceed 500 characters")
    .optional()
    .or(z.literal("")),
  subCategory: z
    .string()
    .max(100, "Sub-category cannot exceed 100 characters")
    .optional()
    .or(z.literal("")),
  status: z.boolean(),
});

type CategoryFormData = z.infer<typeof createCategorySchema>;

const CategoryForm = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isLoadingCategory, setIsLoadingCategory] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);

  const isEditing = Boolean(id);

  const getDefaultValues = useCallback((): CategoryFormData => ({
    name: "",
    description: "",
    subCategory: "",
    status: true,
  }), []);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(createCategorySchema),
    defaultValues: getDefaultValues(),
  });

  const loadCategory = useCallback(async () => {
    if (!id) return;

    setIsLoadingCategory(true);
    try {
      const response = await categoryService.getCategory(id);
      const data = response.data;
      reset({
        name: data.name || "",
        description: data.description || "",
        subCategory: data.subCategory || "",
        status: data.isActive ?? true,
      });
    } catch (error) {
      console.error("Error loading category:", error);
      const message = error instanceof Error ? error.message : "Failed to load category data";
      toast.error(message, { position: "top-center" });
      navigate("/dashboard/category-master");
    } finally {
      setIsLoadingCategory(false);
    }
  }, [id, navigate, reset]);

  useEffect(() => {
    if (isEditing) {
      loadCategory();
    }
  }, [isEditing, loadCategory]);
  const onSubmit = async (data: CategoryFormData) => {
    const payload = {
      name: data.name.trim(),
      description: data.description?.trim() || undefined,
      subCategory: data.subCategory?.trim() || undefined,
      isActive: data.status,
    };

    try {
      if (isEditing && id) {
        await categoryService.updateCategory(id, payload);
        toast.success("Category updated successfully", { position: "top-center" });
      } else {
        await categoryService.createCategory(payload);
        toast.success("Category created successfully", { position: "top-center" });
      }
      navigate("/dashboard/category-master");
    } catch (error) {
      console.error("Category save error:", error);
      const message = error instanceof Error ? error.message : `Failed to ${isEditing ? "update" : "create"} category`;
      toast.error(message, { position: "top-center" });

      if (message.toLowerCase().includes("exists")) {
        setError("name", {
          type: "manual",
          message,
        });
      }

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
    navigate("/dashboard/category-master");
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
                            <Input
                              {...field}
                              id="name"
                              placeholder="Enter category name"
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
                          htmlFor="subCategory"
                          className={`${errors.subCategory ? "text-red-500" : "text-gray-700"
                            } group-hover:text-blue-700 transition-colors duration-200 flex items-center gap-1 font-medium`}
                        >
                          <Tag className="h-4 w-4" /> Sub Category
                        </Label>
                        <Controller
                          name="subCategory"
                          control={control}
                          render={({ field }) => (
                            <Input
                              {...field}
                              id="subCategory"
                              placeholder="Enter sub-category (optional)"
                              maxLength={100}
                              className={`${errors.subCategory
                                ? "border-red-300 focus:border-red-500 focus:ring-red-200"
                                : "border-gray-200 focus:border-blue-500 focus:ring-blue-200"
                                } pl-3 pr-3 py-2 rounded-md shadow-sm focus:ring-4 transition-all duration-200 w-full ${field.value ? "border-blue-300" : ""
                                }`}
                            />
                          )}
                        />
                        <ErrorMessage message={errors.subCategory?.message} />
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
                                onCheckedChange={(checked) => field.onChange(!!checked)}
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