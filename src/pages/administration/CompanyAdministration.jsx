import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronRight,
  FileText,
  Info,
  Loader2,
  Save,
  Settings,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { selectUser } from '@/redux/features/userSlice';
import { companyService } from '@/services/companyService';

const defaultCompanyTemplate = {
  id: '',
  name: '',
  description: '',
  address: '',
  state: '',
  postal_code: '',
  country: '',
  city: '',
  bank_name: '',
  bank_account_number: '',
  ifsc_code: '',
  iban_code: '',
  email: '',
  currency: '$',
  phone: '',
  is_active: true,
  created_at: new Date().toISOString(),
  modified_at: new Date().toISOString(),
  tax_percentage: null,
};

const defaultReportTemplate = {
  payment_details: '',
  remarks: '',
  report_footer: '',
};

const createCompanyState = (seed, companyId) => ({
  ...defaultCompanyTemplate,
  ...seed,
  id: companyId || seed?.id || defaultCompanyTemplate.id,
});

const createReportState = (seed = {}) => ({
  purchaseOrderReport: {
    ...defaultReportTemplate,
    ...(seed.purchaseOrderReport || {}),
  },
  salesReport: {
    ...defaultReportTemplate,
    ...(seed.salesReport || {}),
  },
  stockReport: {
    ...defaultReportTemplate,
    ...(seed.stockReport || {}),
  },
});

const CompanyAdministration = () => {
  const user = useSelector(selectUser);
  const companyId = useMemo(() => user?.company_id || user?.companyId || null, [user]);

  const [expandedSections, setExpandedSections] = useState(() => new Set(['information']));
  const [expandedReportSections, setExpandedReportSections] = useState(() => new Set(['purchase_order']));
  const [isLoading, setIsLoading] = useState(true);

  const [companyInfo, setCompanyInfo] = useState(() => createCompanyState({}, companyId));
  const [reportConfig, setReportConfig] = useState(() => createReportState());
  const [errors, setErrors] = useState({});
  const [companyEmail, setCompanyEmail] = useState(null);
  const [emailRefreshToken, setEmailRefreshToken] = useState('');
  const [isEmailAuthenticated, setIsEmailAuthenticated] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const fetchCompanyData = useCallback(async () => {
    if (!companyId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await companyService.getCompany();
      const company = response.data;

      if (company) {
        // Map backend fields to frontend format
        const mappedCompany = {
          id: company._id || company.id || companyId,
          name: company.name || '',
          description: company.description || '',
          address: company.address || '',
          state: company.state || '',
          postal_code: company.postalCode || company.postal_code || '',
          country: company.country || '',
          city: company.city || '',
          bank_name: company.bankName || company.bank_name || '',
          bank_account_number: company.bankAccountNumber || company.bank_account_number || '',
          ifsc_code: company.ifscCode || company.ifsc_code || '',
          iban_code: company.ibanCode || company.iban_code || '',
          email: company.email || '',
          currency: company.currency || '$',
          phone: company.phone || '',
          is_active: company.isActive !== undefined ? company.isActive : true,
          created_at: company.createdAt || company.created_at || new Date().toISOString(),
          modified_at: company.updatedAt || company.modified_at || new Date().toISOString(),
          tax_percentage: company.taxPercentage || company.tax_percentage || null,
        };

        // Map report configurations
        const mappedReports = {
          purchaseOrderReport: {
            payment_details: company.purchaseOrderReport?.paymentDetails || company.purchaseOrderReport?.payment_details || '',
            remarks: company.purchaseOrderReport?.remarks || '',
            report_footer: company.purchaseOrderReport?.reportFooter || company.purchaseOrderReport?.report_footer || '',
          },
          salesReport: {
            payment_details: company.salesReport?.paymentDetails || company.salesReport?.payment_details || '',
            remarks: company.salesReport?.remarks || '',
            report_footer: company.salesReport?.reportFooter || company.salesReport?.report_footer || '',
          },
          stockReport: {
            payment_details: company.stockReport?.paymentDetails || company.stockReport?.payment_details || '',
            remarks: company.stockReport?.remarks || '',
            report_footer: company.stockReport?.reportFooter || company.stockReport?.report_footer || '',
          },
        };

        setCompanyInfo(mappedCompany);
        setReportConfig(mappedReports);
        setCompanyEmail(company.email || null);
        setEmailRefreshToken(company.emailRefreshToken || '');
        setIsEmailAuthenticated(Boolean(company.isEmailAuthenticated));
        setErrors({});
      }
    } catch (error) {
      console.error('Error fetching company data:', error);
      toast.error('Failed to load company data');
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchCompanyData();
  }, [fetchCompanyData]);

  const toggleSection = (section) => {
    setExpandedSections((prev) => {
      if (prev.has(section)) {
        return new Set();
      }
      return new Set([section]);
    });
  };

  const toggleReportSection = (section) => {
    setExpandedReportSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const validateForm = useCallback(() => {
    const validationErrors = {};

    if (!companyInfo.name.trim()) {
      validationErrors.name = 'Company name is required';
    }

    if (!companyInfo.email?.trim()) {
      validationErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyInfo.email)) {
      validationErrors.email = 'Invalid email format';
    } else if (/[A-Z]/.test(companyInfo.email)) {
      validationErrors.email = 'Email must be lowercase';
    }

    if (companyInfo.phone && !/^[+]?\d[\d\s-]{3,}$/.test(companyInfo.phone)) {
      validationErrors.phone = 'Invalid phone number';
    }

    if (companyInfo.bank_account_number && !/^\d+$/.test(companyInfo.bank_account_number)) {
      validationErrors.bank_account_number = 'Bank account number must be numeric';
    }

    setErrors(validationErrors);
    return Object.keys(validationErrors).length === 0;
  }, [companyInfo]);

  const handleSave = async () => {
    if (!validateForm()) {
      toast.error('Please resolve the highlighted fields.');
      return;
    }

    if (!companyId) {
      toast.error('Company context missing');
      return;
    }

    setIsLoading(true);
    try {
      // Map frontend format to backend format
      const updatePayload = {
        name: companyInfo.name,
        email: companyInfo.email,
        phone: companyInfo.phone || undefined,
        description: companyInfo.description || undefined,
        address: companyInfo.address || undefined,
        city: companyInfo.city || undefined,
        state: companyInfo.state || undefined,
        country: companyInfo.country || undefined,
        postalCode: companyInfo.postal_code || undefined,
        bankName: companyInfo.bank_name || undefined,
        bankAccountNumber: companyInfo.bank_account_number || undefined,
        ifscCode: companyInfo.ifsc_code || undefined,
        ibanCode: companyInfo.iban_code || undefined,
        currency: companyInfo.currency,
        taxPercentage: companyInfo.tax_percentage || undefined,
        purchaseOrderReport: {
          paymentDetails: reportConfig.purchaseOrderReport.payment_details || undefined,
          remarks: reportConfig.purchaseOrderReport.remarks || undefined,
          reportFooter: reportConfig.purchaseOrderReport.report_footer || undefined,
        },
        salesReport: {
          paymentDetails: reportConfig.salesReport.payment_details || undefined,
          remarks: reportConfig.salesReport.remarks || undefined,
          reportFooter: reportConfig.salesReport.report_footer || undefined,
        },
        stockReport: {
          paymentDetails: reportConfig.stockReport.payment_details || undefined,
          remarks: reportConfig.stockReport.remarks || undefined,
          reportFooter: reportConfig.stockReport.report_footer || undefined,
        },
        emailRefreshToken: emailRefreshToken || undefined,
        isEmailAuthenticated: isEmailAuthenticated,
      };

      const response = await companyService.updateCompany(updatePayload);
      const updatedCompany = response.data;

      // Update local state with response
      if (updatedCompany) {
        const mappedCompany = {
          ...companyInfo,
          name: updatedCompany.name || companyInfo.name,
          email: updatedCompany.email || companyInfo.email,
          phone: updatedCompany.phone || companyInfo.phone,
          currency: updatedCompany.currency || companyInfo.currency,
          modified_at: updatedCompany.updatedAt || updatedCompany.modified_at || new Date().toISOString(),
        };

        setCompanyInfo(mappedCompany);
        setCompanyEmail(updatedCompany.email || null);

        // Update userData in localStorage if needed
        if (user?.id) {
          const persisted = {
            ...JSON.parse(localStorage.getItem('userData') || '{}'),
            company_data: {
              ...(JSON.parse(localStorage.getItem('userData') || '{}').company_data || {}),
              currency: updatedCompany.currency || companyInfo.currency,
              name: updatedCompany.name || companyInfo.name,
            },
          };
          localStorage.setItem('userData', JSON.stringify(persisted));
        }

        toast.success('Company administration settings saved successfully.');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error?.message || 'Unable to save changes right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSaveButton = () => (
    <Button
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        handleSave();
      }}
      disabled={isLoading}
      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2"
    >
      {isLoading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
          Saving...
        </>
      ) : (
        <>
          <Save className="h-4 w-4" />
          Save All Changes
        </>
      )}
    </Button>
  );

  const authenticateEmail = async () => {
    setIsAuthenticating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const token = `mock-token-${Date.now()}`;
      setEmailRefreshToken(token);
      setIsEmailAuthenticated(true);
      toast.success('Email authenticated for this demo workspace.');
    } catch (error) {
      console.error('Email authentication error:', error);
      toast.error('Unable to authenticate email right now.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleEmailChange = (value) => {
    setCompanyEmail(value);
    setCompanyInfo((prev) => ({
      ...prev,
      email: value,
    }));
  };

  if (!companyId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No Company Context</h2>
            <p className="text-gray-500">Please ensure you are logged in with a valid company association to manage administration settings.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Administration</h1>
          <p className="text-gray-600">
            Manage company details and report customization.
          </p>
        </div>

        <div className="mb-6 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            Last synced {new Date(companyInfo.modified_at || new Date().toISOString()).toLocaleString()}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={fetchCompanyData}
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
              disabled={isLoading}
            >
              {isLoading ? 'Refreshing...' : 'Refresh Data'}
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm border-gray-200">
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
              onClick={() => toggleSection('information')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Building2 className="h-6 w-6 text-blue-600" />
                  <CardTitle className="text-xl text-gray-900">Company Information</CardTitle>
                </div>
                {expandedSections.has('information') ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </CardHeader>
            {expandedSections.has('information') && (
              <CardContent className="pt-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Basic Information</h3>

                      <div className="form-field">
                        <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                          Company Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          value={companyInfo.name}
                          onChange={(event) => setCompanyInfo({ ...companyInfo, name: event.target.value })}
                          className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
                          placeholder="Enter company name"
                        />
                        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                      </div>

                      <div className="form-field">
                        <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          value={companyInfo.description || ''}
                          onChange={(event) => setCompanyInfo({ ...companyInfo, description: event.target.value })}
                          className="mt-1"
                          placeholder="Enter company description"
                          rows={3}
                        />
                      </div>

                      <div className="form-field">
                        <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                          Email <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={companyEmail || ''}
                          onChange={(event) => handleEmailChange(event.target.value)}
                          className={`mt-1 ${errors.email ? 'border-red-500' : ''}`}
                          placeholder="Enter company email"
                        />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="form-field">
                          <Label htmlFor="phone" className="text-sm font-medium text-gray-700">
                            Phone
                          </Label>
                          <Input
                            id="phone"
                            value={companyInfo.phone || ''}
                            onChange={(event) => setCompanyInfo({ ...companyInfo, phone: event.target.value })}
                            className={`mt-1 ${errors.phone ? 'border-red-500' : ''}`}
                            placeholder="Enter phone number"
                          />
                          {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                        </div>
                        <div className="form-field">
                          <Label htmlFor="currency" className="text-sm font-medium text-gray-700">
                            Currency Symbol
                          </Label>
                          <Select
                            value={companyInfo.currency || '$'}
                            onValueChange={(value) => setCompanyInfo({ ...companyInfo, currency: value })}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="$">$ (USD)</SelectItem>
                              <SelectItem value="€">€ (EUR)</SelectItem>
                              <SelectItem value="£">£ (GBP)</SelectItem>
                              <SelectItem value="₹">₹ (INR)</SelectItem>
                              <SelectItem value="¥">¥ (JPY)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="form-field">
                        <Label htmlFor="tax_percentage" className="text-sm font-medium text-gray-700">
                          Tax Percentage
                        </Label>
                        <Input
                          id="tax_percentage"
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          value={companyInfo.tax_percentage ?? ''}
                          onChange={(event) => setCompanyInfo({ ...companyInfo, tax_percentage: event.target.value ? parseFloat(event.target.value) : null })}
                          className="mt-1"
                          placeholder="Enter tax percentage (0-100)"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Address & Banking</h3>

                      <div className="form-field">
                        <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                          Address
                        </Label>
                        <Textarea
                          id="address"
                          value={companyInfo.address || ''}
                          onChange={(event) => setCompanyInfo({ ...companyInfo, address: event.target.value })}
                          className="mt-1"
                          placeholder="Enter company address"
                          rows={3}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                            City
                          </Label>
                          <Input
                            id="city"
                            value={companyInfo.city || ''}
                            onChange={(event) => setCompanyInfo({ ...companyInfo, city: event.target.value })}
                            className="mt-1"
                            placeholder="City"
                          />
                        </div>
                        <div>
                          <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                            State
                          </Label>
                          <Input
                            id="state"
                            value={companyInfo.state || ''}
                            onChange={(event) => setCompanyInfo({ ...companyInfo, state: event.target.value })}
                            className="mt-1"
                            placeholder="State/Province"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="country" className="text-sm font-medium text-gray-700">
                            Country
                          </Label>
                          <Input
                            id="country"
                            value={companyInfo.country || ''}
                            onChange={(event) => setCompanyInfo({ ...companyInfo, country: event.target.value })}
                            className="mt-1"
                            placeholder="Country"
                          />
                        </div>
                        <div>
                          <Label htmlFor="postal_code" className="text-sm font-medium text-gray-700">
                            Postal Code
                          </Label>
                          <Input
                            id="postal_code"
                            value={companyInfo.postal_code || ''}
                            onChange={(event) => setCompanyInfo({ ...companyInfo, postal_code: event.target.value })}
                            className="mt-1"
                            placeholder="Postal code"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="bank_name" className="text-sm font-medium text-gray-700">
                            Bank Name
                          </Label>
                          <Input
                            id="bank_name"
                            value={companyInfo.bank_name || ''}
                            onChange={(event) => setCompanyInfo({ ...companyInfo, bank_name: event.target.value })}
                            className="mt-1"
                            placeholder="Bank name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="bank_account_number" className="text-sm font-medium text-gray-700">
                            Bank Account Number
                          </Label>
                          <Input
                            id="bank_account_number"
                            value={companyInfo.bank_account_number || ''}
                            onChange={(event) => setCompanyInfo({ ...companyInfo, bank_account_number: event.target.value })}
                            className={`mt-1 ${errors.bank_account_number ? 'border-red-500' : ''}`}
                            placeholder="Account number"
                          />
                          {errors.bank_account_number && (
                            <p className="text-red-500 text-xs mt-1">{errors.bank_account_number}</p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="ifsc_code" className="text-sm font-medium text-gray-700">
                            IFSC Code
                          </Label>
                          <Input
                            id="ifsc_code"
                            value={companyInfo.ifsc_code || ''}
                            onChange={(event) => setCompanyInfo({ ...companyInfo, ifsc_code: event.target.value })}
                            className="mt-1"
                            placeholder="IFSC code"
                          />
                        </div>
                        <div>
                          <Label htmlFor="iban_code" className="text-sm font-medium text-gray-700">
                            IBAN Code
                          </Label>
                          <Input
                            id="iban_code"
                            value={companyInfo.iban_code || ''}
                            onChange={(event) => setCompanyInfo({ ...companyInfo, iban_code: event.target.value })}
                            className="mt-1"
                            placeholder="IBAN"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* System Settings Section - Hidden but not removed */}
          {/* <Card className="shadow-sm border-gray-200">
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
              onClick={() => toggleSection('settings')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Settings className="h-6 w-6 text-green-600" />
                  <CardTitle className="text-xl text-gray-900">System Settings</CardTitle>
                </div>
                {expandedSections.has('settings') ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </CardHeader>
            {expandedSections.has('settings') && (
              <CardContent className="pt-0">
                <div className="space-y-6">
                  <div className="form-field">
                    <Label htmlFor="company_email" className="text-sm font-medium text-gray-700">
                      Email <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="company_email"
                      value={companyEmail ?? ''}
                      className={`mt-1 ${errors.email_url ? 'border-red-500' : ''}`}
                      placeholder="Enter email"
                      readOnly
                    />
                    {errors.email_url && <p className="text-red-500 text-xs mt-1">{errors.email_url}</p>}
                  </div>

                  <div>
                    {isEmailAuthenticated && emailRefreshToken ? (
                      <p className="text-green-600 flex text-sm items-center">
                        <ShieldCheck className="h-5 w-5 mr-1" /> Email is verified & authenticated.
                      </p>
                    ) : (
                      <>
                        <Button
                          type="button"
                          onClick={authenticateEmail}
                          disabled={isAuthenticating}
                          className="text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg me-2"
                        >
                          {isAuthenticating ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" /> Authenticating...
                            </span>
                          ) : (
                            <span className="flex items-center">Authenticate Email</span>
                          )}
                        </Button>
                        <p className="text-gray-600 flex text-xs mt-2 items-center">
                          <Info className="h-4 w-4 mr-1" /> Emails can only be sent from authenticated addresses.
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card> */}

          <Card className="shadow-sm border-gray-200">
            <CardHeader
              className="cursor-pointer hover:bg-gray-50 transition-colors duration-200"
              onClick={() => toggleSection('customization')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-purple-600" />
                  <CardTitle className="text-xl text-gray-900">Report Customization</CardTitle>
                </div>
                {expandedSections.has('customization') ? (
                  <ChevronDown className="h-5 w-5 text-gray-500" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-500" />
                )}
              </div>
            </CardHeader>
            {expandedSections.has('customization') && (
              <CardContent className="pt-0">
                <div className="space-y-8">
                  {[
                    {
                      key: 'purchase_order',
                      title: 'Purchase Order Report',
                      color: 'bg-blue-500',
                      stateKey: 'purchaseOrderReport',
                    },
                    {
                      key: 'sales',
                      title: 'Sales Report',
                      color: 'bg-green-500',
                      stateKey: 'salesReport',
                    },
                    {
                      key: 'stock',
                      title: 'Stock Report',
                      color: 'bg-purple-500',
                      stateKey: 'stockReport',
                    },
                  ].map(({ key, title, color, stateKey }) => (
                    <div key={key} className="border border-gray-200 rounded-lg">
                      <div
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                        onClick={() => toggleReportSection(key)}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 ${color} rounded-full`} />
                          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                        </div>
                        {expandedReportSections.has(key) ? (
                          <ChevronDown className="h-5 w-5 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-500" />
                        )}
                      </div>

                      {expandedReportSections.has(key) && (
                        <div className="px-4 pb-4 space-y-4">
                          <div className="form-field">
                            <Label className="text-sm font-medium text-gray-700">Payment Details</Label>
                            <Textarea
                              value={reportConfig[stateKey].payment_details || ''}
                              onChange={(event) =>
                                setReportConfig((prev) => ({
                                  ...prev,
                                  [stateKey]: {
                                    ...prev[stateKey],
                                    payment_details: event.target.value,
                                  },
                                }))
                              }
                              className="mt-1"
                              placeholder="Enter payment details template"
                              rows={3}
                            />
                          </div>

                          <div className="form-field">
                            <Label className="text-sm font-medium text-gray-700">Remarks</Label>
                            <Textarea
                              value={reportConfig[stateKey].remarks || ''}
                              onChange={(event) =>
                                setReportConfig((prev) => ({
                                  ...prev,
                                  [stateKey]: {
                                    ...prev[stateKey],
                                    remarks: event.target.value,
                                  },
                                }))
                              }
                              className="mt-1"
                              placeholder="Enter remarks template"
                              rows={3}
                            />
                          </div>

                          <div className="form-field">
                            <Label className="text-sm font-medium text-gray-700">Report Footer</Label>
                            <Textarea
                              value={reportConfig[stateKey].report_footer || ''}
                              onChange={(event) =>
                                setReportConfig((prev) => ({
                                  ...prev,
                                  [stateKey]: {
                                    ...prev[stateKey],
                                    report_footer: event.target.value,
                                  },
                                }))
                              }
                              className="mt-1"
                              placeholder="Enter report footer template"
                              rows={3}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        <div className="mt-8 flex justify-end">{renderSaveButton()}</div>
      </div>
    </div>
  );
};

export default CompanyAdministration;
