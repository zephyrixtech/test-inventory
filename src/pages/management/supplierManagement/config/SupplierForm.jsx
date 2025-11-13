import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Building2,
  CreditCard,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  Truck,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Loader2,
  Star,
  DollarSign,
  Save,
  Edit3,
  Package,
  Search,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import toast from "react-hot-toast";
import { supplierService } from "@/services/supplierService";

// Mock Data for brands and supplies (in a real app, these would come from APIs)
const mockBrands = [
  { id: "1", name: "Apple" },
  { id: "2", name: "Samsung" },
  { id: "3", name: "Sony" },
  { id: "4", name: "Dell" },
  { id: "5", name: "HP" },
];

const mockSupplies = [
  { id: "1", name: "iPhone 15", description: "Latest smartphone", price: 999, category_id: "1" },
  { id: "2", name: "Galaxy S24", description: "Flagship Android", price: 899, category_id: "2" },
  { id: "3", name: "WH-1000XM5", description: "Noise-cancelling headphones", price: 399, category_id: "3" },
  { id: "4", name: "XPS 13", description: "Premium ultrabook", price: 1299, category_id: "4" },
  { id: "5", name: "Pavilion 15", description: "Everyday laptop", price: 699, category_id: "5" },
];

const formatCurrency = (value) => `$${value.toLocaleString()}`;

const StarRating = ({ rating, onRatingChange, readonly = false }) => {
  const [hoverRating, setHoverRating] = useState(0);

  const getRatingLabel = (r) => {
    if (r >= 4.5) return "Excellent";
    if (r >= 3.5) return "Good";
    if (r >= 2.5) return "Average";
    if (r >= 1.5) return "Poor";
    if (r > 0) return "Very Poor";
    return "";
  };

  return (
    <div className="flex items-center gap-1">
      {[...Array(5)].map((_, i) => {
        const starValue = i + 1;
        const isFilled = (hoverRating || rating) >= starValue;
        const isHalf = !isFilled && (hoverRating || rating) >= starValue - 0.5;

        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            className={`${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} transition-transform`}
            onMouseEnter={() => !readonly && setHoverRating(starValue)}
            onMouseLeave={() => !readonly && setHoverRating(0)}
            onClick={() => !readonly && onRatingChange(starValue)}
          >
            <Star
              className={`h-5 w-5 ${isFilled
                ? "fill-yellow-400 text-yellow-400"
                : isHalf
                  ? "fill-yellow-200 text-yellow-400"
                  : "fill-gray-200 text-gray-300"
                } transition-colors`}
            />
          </button>
        );
      })}
      {rating > 0 && (
        <span className="ml-2 text-sm text-gray-600 font-medium">
          {getRatingLabel(rating)}
        </span>
      )}
    </div>
  );
};

const SupplierForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isEditing = Boolean(id);
  const isViewMode = location.pathname.includes("/view");

  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [brandSearchTerm, setBrandSearchTerm] = useState("");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedSupplies, setSelectedSupplies] = useState([]);
  const [filteredBrands, setFilteredBrands] = useState([]);
  const [filteredSupplies, setFilteredSupplies] = useState([]);
  const [showBrandsDropdown, setShowBrandsDropdown] = useState(false);
  const [showSuppliesDropdown, setShowSuppliesDropdown] = useState(false);
  const [tempSelectedBrands, setTempSelectedBrands] = useState([]);
  const [tempSelectedSupplies, setTempSelectedSupplies] = useState([]);
  const [isBrandsExpanded, setIsBrandsExpanded] = useState(false);
  const [isSuppliesExpanded, setIsSuppliesExpanded] = useState(false);
  const [supplierData, setSupplierData] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    watch,
    setValue,
  } = useForm({
    defaultValues: {
      companyId: "",
      name: "",
      registrationNumber: "",
      taxId: "",
      contactPerson: "",
      email: "",
      phone: "",
      website: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      bankName: "",
      bank_account_number: "",
      ifscCode: "",
      ibanCode: "",
      creditLimit: 0,
      paymentTerms: "",
      description: "",
      status: "approved",
      rating: 0,
      notes: "",
    },
  });

  const watched = watch();

  // Load supplier data when editing
  useEffect(() => {
    if (isEditing) {
      fetchSupplierData();
    }
  }, [id, isEditing]);

  const fetchSupplierData = async () => {
    try {
      const response = await supplierService.getSupplier(id);
      console.log("Supplier data response:", response); // For debugging
      
      // Access the data correctly based on the actual API response structure
      const supplier = response.data;
      
      setSupplierData(supplier);
      
      reset({
        companyId: supplier.supplierId,
        name: supplier.name,
        registrationNumber: supplier.registrationNumber || "",
        taxId: supplier.taxId || "",
        contactPerson: supplier.contactPerson || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        website: supplier.website || "",
        address: supplier.address || "",
        city: supplier.city || "",
        state: supplier.state || "",
        postalCode: supplier.postalCode || "",
        country: supplier.country || "",
        bankName: supplier.bankName || "",
        bank_account_number: supplier.bank_account_number || "",
        ifscCode: supplier.ifscCode || "",
        ibanCode: supplier.ibanCode || "",
        creditLimit: supplier.creditLimit || 0,
        paymentTerms: supplier.paymentTerms || "",
        description: supplier.description || "",
        status: supplier.status || "approved",
        rating: supplier.rating || 0,
        notes: supplier.notes || "",
      });

      // Set selected brands and supplies if they exist
      if (supplier.selectedBrands) {
        const brands = mockBrands.filter(b => supplier.selectedBrands.includes(b.id));
        setSelectedBrands(brands);
      }
      
      if (supplier.selectedSupplies) {
        const supplies = mockSupplies.filter(s => supplier.selectedSupplies.includes(s.id));
        setSelectedSupplies(supplies);
      }
    } catch (error) {
      console.error("Error fetching supplier:", error);
      toast.error("Failed to load supplier data");
    }
  };

  // Filter brands
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (brandSearchTerm.length < 2) {
        setFilteredBrands([]);
        setShowBrandsDropdown(false);
        return;
      }
      const filtered = mockBrands.filter(b =>
        b.name.toLowerCase().includes(brandSearchTerm.toLowerCase())
      );
      setFilteredBrands(filtered);
      setShowBrandsDropdown(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [brandSearchTerm]);

  // Filter supplies
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchTerm.length < 2 || selectedBrands.length === 0) {
        setFilteredSupplies([]);
        setShowSuppliesDropdown(false);
        return;
      }
      const brandIds = selectedBrands.map(b => b.id);
      const filtered = mockSupplies.filter(
        s =>
          brandIds.includes(s.category_id) &&
          (s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           s.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredSupplies(filtered);
      setShowSuppliesDropdown(true);
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm, selectedBrands]);

  const handleBrandToggle = (brand) => {
    const isSelected = tempSelectedBrands.includes(brand.id);
    if (isSelected) {
      setTempSelectedBrands(tempSelectedBrands.filter(id => id !== brand.id));
    } else {
      setTempSelectedBrands([...tempSelectedBrands, brand.id]);
    }
  };

  const handleSupplyToggle = (supply) => {
    const isSelected = tempSelectedSupplies.includes(supply.id);
    if (isSelected) {
      setTempSelectedSupplies(tempSelectedSupplies.filter(id => id !== supply.id));
    } else {
      setTempSelectedSupplies([...tempSelectedSupplies, supply.id]);
    }
  };

  const confirmBrands = () => {
    const newBrands = mockBrands.filter(
      b => tempSelectedBrands.includes(b.id) || selectedBrands.some(sb => sb.id === b.id)
    );
    setSelectedBrands(newBrands);
    setValue("selectedBrands", newBrands.map(b => b.id));
    setTempSelectedBrands([]);
    setBrandSearchTerm("");
    setShowBrandsDropdown(false);

    // Filter supplies to match selected brands
    const brandIds = newBrands.map(b => b.id);
    const filtered = selectedSupplies.filter(s => brandIds.includes(s.category_id));
    setSelectedSupplies(filtered);
    setValue("selectedSupplies", filtered.map(s => s.id));
  };

  const confirmSupplies = () => {
    const newIds = [...new Set([...tempSelectedSupplies, ...selectedSupplies.map(s => s.id)])];
    const newSupplies = mockSupplies.filter(s => newIds.includes(s.id));
    setSelectedSupplies(newSupplies);
    setValue("selectedSupplies", newSupplies.map(s => s.id));
    setTempSelectedSupplies([]);
    setSearchTerm("");
    setShowSuppliesDropdown(false);
  };

  const removeBrand = (id) => {
    const updated = selectedBrands.filter(b => b.id !== id);
    setSelectedBrands(updated);
    setValue("selectedBrands", updated.map(b => b.id));

    const brandIds = updated.map(b => b.id);
    const filtered = selectedSupplies.filter(s => brandIds.includes(s.category_id));
    setSelectedSupplies(filtered);
    setValue("selectedSupplies", filtered.map(s => s.id));
  };

  const removeSupply = (id) => {
    const updated = selectedSupplies.filter(s => s.id !== id);
    setSelectedSupplies(updated);
    setValue("selectedSupplies", updated.map(s => s.id));
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const supplierData = {
        supplierId: data.companyId,
        name: data.name,
        registrationNumber: data.registrationNumber,
        taxId: data.taxId,
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        website: data.website,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        country: data.country,
        bankName: data.bankName,
        bank_account_number: data.bank_account_number,
        ifscCode: data.ifscCode,
        ibanCode: data.ibanCode,
        creditLimit: data.creditLimit,
        paymentTerms: data.paymentTerms,
        description: data.description,
        status: data.status,
        rating: data.rating,
        notes: data.notes,
        selectedBrands: selectedBrands.map(b => b.id),
        selectedSupplies: selectedSupplies.map(s => s.id),
      };

      if (isEditing) {
        await supplierService.updateSupplier(id, supplierData);
        toast.success("Supplier updated successfully!");
      } else {
        await supplierService.createSupplier(supplierData);
        toast.success("Supplier created successfully!");
      }
      
      setTimeout(() => navigate("/dashboard/supplierManagement"), 1000);
    } catch (error) {
      console.error("Error saving supplier:", error);
      toast.error(isEditing ? "Failed to update supplier" : "Failed to create supplier");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/dashboard/supplierManagement")}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5 text-blue-600" />
          </Button>
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isViewMode ? "View Supplier" : isEditing ? "Update Supplier" : "Add New Supplier"}
              </h1>
              <p className="text-gray-600">
                {isViewMode ? "View details" : isEditing ? "Update info" : "Create new supplier"}
              </p>
            </div>
          </div>
        </div>

        <Card className="border-none shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-blue-800">Supplier Information</CardTitle>
          </CardHeader>
          <CardContent className="p-6 bg-white">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Basic Info */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Basic Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Company ID *</Label>
                    <Input {...register("companyId", { required: "Required" })} disabled={isViewMode} />
                    {errors.companyId && <p className="text-red-500 text-sm">{errors.companyId.message}</p>}
                  </div>
                  <div>
                    <Label>Company Name *</Label>
                    <Input {...register("name", { required: "Required" })} disabled={isViewMode} />
                  </div>
                  <div>
                    <Label>Registration Number *</Label>
                    <Input {...register("registrationNumber", { required: "Required" })} disabled={isViewMode} />
                  </div>
                  <div>
                    <Label>Tax ID *</Label>
                    <Input {...register("taxId", { required: "Required" })} disabled={isViewMode} />
                  </div>
                  <div>
                    <Label>Contact Person *</Label>
                    <Input {...register("contactPerson", { required: "Required" })} disabled={isViewMode} />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Mail className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Contact Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Label>Email *</Label>
                    <Input type="email" {...register("email", { required: "Required" })} disabled={isViewMode} />
                  </div>
                  <div>
                    <Label>Phone *</Label>
                    <Input {...register("phone", { required: "Required" })} disabled={isViewMode} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Website</Label>
                    <Input {...register("website")} disabled={isViewMode} />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Address</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Label>Street Address *</Label>
                    <Input {...register("address", { required: "Required" })} disabled={isViewMode} />
                  </div>
                  <div><Label>City *</Label><Input {...register("city", { required: "Required" })} disabled={isViewMode} /></div>
                  <div><Label>State *</Label><Input {...register("state", { required: "Required" })} disabled={isViewMode} /></div>
                  <div><Label>Postal Code *</Label><Input {...register("postalCode", { required: "Required" })} disabled={isViewMode} /></div>
                  <div><Label>Country *</Label><Input {...register("country", { required: "Required" })} disabled={isViewMode} /></div>
                </div>
              </div>

              {/* Supplies */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Supplies</h3>
                </div>

                {/* Brand Search */}
                <div className="space-y-3">
                  <Label>Search Brands</Label>
                  <div className="relative">
                    <Input
                      placeholder="Type to search brands..."
                      value={brandSearchTerm}
                      onChange={(e) => setBrandSearchTerm(e.target.value)}
                      onFocus={() => setShowBrandsDropdown(true)}
                      disabled={isViewMode}
                    />
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  </div>

                  {showBrandsDropdown && filteredBrands.length > 0 && (
                    <div className="border rounded-lg shadow-lg bg-white max-h-64 overflow-y-auto">
                      {filteredBrands.map(brand => (
                        <div key={brand.id} className="p-3 hover:bg-gray-50 flex items-center gap-3">
                          <Checkbox
                            checked={tempSelectedBrands.includes(brand.id) || selectedBrands.some(b => b.id === brand.id)}
                            onCheckedChange={() => handleBrandToggle(brand)}
                            disabled={isViewMode}
                          />
                          <span>{brand.name}</span>
                        </div>
                      ))}
                      <div className="p-2 border-t flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setTempSelectedBrands([]); setShowBrandsDropdown(false); }}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={confirmBrands}>Confirm</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Brands */}
                {selectedBrands.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Selected Brands ({selectedBrands.length})</Label>
                      <Button variant="ghost" size="sm" onClick={() => setIsBrandsExpanded(!isBrandsExpanded)}>
                        {isBrandsExpanded ? <ChevronUp /> : <ChevronDown />} {isBrandsExpanded ? "Collapse" : "Expand"}
                      </Button>
                    </div>
                    {isBrandsExpanded && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {selectedBrands.map(b => (
                          <div key={b.id} className="p-3 border rounded-lg bg-blue-50 flex justify-between items-center">
                            <span>{b.name}</span>
                            {!isViewMode && <Button size="sm" variant="ghost" onClick={() => removeBrand(b.id)}><X className="h-4 w-4" /></Button>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Supply Search */}
                <div className="space-y-3">
                  <Label>Search Supplies</Label>
                  <Input
                    placeholder={selectedBrands.length === 0 ? "Select brand first" : "Search items..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onFocus={() => setShowSuppliesDropdown(true)}
                    disabled={selectedBrands.length === 0 || isViewMode}
                  />
                  {showSuppliesDropdown && filteredSupplies.length > 0 && (
                    <div className="border rounded-lg shadow-lg bg-white max-h-64 overflow-y-auto">
                      {filteredSupplies.map(supply => (
                        <div key={supply.id} className="p-3 hover:bg-gray-50 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={tempSelectedSupplies.includes(supply.id) || selectedSupplies.some(s => s.id === supply.id)}
                              onCheckedChange={() => handleSupplyToggle(supply)}
                              disabled={isViewMode}
                            />
                            <div>
                              <p className="font-medium">{supply.name}</p>
                              <p className="text-xs text-gray-500">{supply.description}</p>
                            </div>
                          </div>
                          <p className="font-semibold text-blue-600">{formatCurrency(supply.price)}</p>
                        </div>
                      ))}
                      <div className="p-2 border-t flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setTempSelectedSupplies([]); setShowSuppliesDropdown(false); }}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={confirmSupplies}>Confirm</Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Supplies */}
                {selectedSupplies.length > 0 && (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <Label>Selected Supplies ({selectedSupplies.length})</Label>
                      <Button variant="ghost" size="sm" onClick={() => setIsSuppliesExpanded(!isSuppliesExpanded)}>
                        {isSuppliesExpanded ? <ChevronUp /> : <ChevronDown />} {isSuppliesExpanded ? "Collapse" : "Expand"}
                      </Button>
                    </div>
                    {isSuppliesExpanded && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedSupplies.map(s => (
                          <div key={s.id} className="p-3 border rounded-lg bg-blue-50 flex justify-between items-start">
                            <div>
                              <p className="font-medium">{s.name}</p>
                              <p className="text-sm text-gray-600">{s.description}</p>
                              <p className="font-semibold text-blue-600">{formatCurrency(s.price)}</p>
                            </div>
                            {!isViewMode && <Button size="sm" variant="ghost" onClick={() => removeSupply(s.id)}><X className="h-4 w-4" /></Button>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Financial */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Financial Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div><Label>Bank Name *</Label><Input {...register("bankName", { required: "Required" })} disabled={isViewMode} /></div>
                  <div><Label>Account Number *</Label><Input {...register("bank_account_number", { required: "Required" })} disabled={isViewMode} /></div>
                  <div><Label>IFSC Code *</Label><Input {...register("ifscCode", { required: "Required" })} disabled={isViewMode} /></div>
                  <div><Label>IBAN Code *</Label><Input {...register("ibanCode", { required: "Required" })} disabled={isViewMode} /></div>
                  <div><Label>Credit Limit *</Label><Input type="number" {...register("creditLimit", { valueAsNumber: true, required: "Required" })} disabled={isViewMode} /></div>
                  <div><Label>Payment Terms *</Label><Input {...register("paymentTerms", { required: "Required" })} disabled={isViewMode} /></div>
                </div>
              </div>

              {/* Additional */}
              <div className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-semibold">Additional Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea {...register("description")} disabled={isViewMode} className="min-h-24" />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Status *</Label>
                    <Select onValueChange={(v) => setValue("status", v)} defaultValue="approved" disabled={isViewMode}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Rating *</Label>
                    <StarRating rating={watched.rating || 0} onRatingChange={(r) => setValue("rating", r)} readonly={isViewMode} />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Notes</Label>
                    <Textarea {...register("notes")} disabled={isViewMode} className="min-h-32" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              {!isViewMode && (
                <div className="flex justify-end gap-3 pt-6 border-t">
                  <Button type="button" variant="outline" onClick={() => navigate("/dashboard/supplierManagement")}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || isLoading}>
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : isEditing ? "Update" : "Save"}
                  </Button>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupplierForm;