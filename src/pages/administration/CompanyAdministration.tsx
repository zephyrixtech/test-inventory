import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronDown, ChevronRight, Save, Building2, Settings, FileText, AlertCircle, ShieldCheck, Info, Loader2 } from 'lucide-react';
import { ICompany, IReportConfig } from '@/Utils/constants';
import { supabase } from '@/Utils/types/supabaseClient';
import toast from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { selectUser } from '@/redux/features/userSlice';

const CompanyAdministration: React.FC = (): React.JSX.Element => {
  const user = useSelector(selectUser);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['information']));
  const [expandedReportSections, setExpandedReportSections] = useState<Set<string>>(new Set(['purchase_order']));
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [companyInfo, setCompanyInfo] = useState<ICompany>({
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
    tax_percentage: null
  });

  const [reportConfig, setReportConfig] = useState<{
    purchaseOrderReport: IReportConfig;
    salesReport: IReportConfig;
    stockReport: IReportConfig;
  }>({
    purchaseOrderReport: {
      id: '',
      company_id: '',
      report_type: 'purchase_order',
      payment_details: '',
      remarks: '',
      report_footer: '',
      created_at: new Date().toISOString(),
    },
    salesReport: {
      id: '',
      company_id: '',
      report_type: 'sales',
      payment_details: '',
      remarks: '',
      report_footer: '',
      created_at: new Date().toISOString(),
    },
    stockReport: {
      id: '',
      company_id: '',
      report_type: 'stock',
      payment_details: '',
      remarks: '',
      report_footer: '',
      created_at: new Date().toISOString(),
    }
  });

  // Validation states
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [companyEmail, setCompanyEmail] = useState<string | null>(null);
  const [emailRefreshToken, setEmailRefreshToken] = useState('');
  const [isEmailAuthenticated, setIsEmailAuthenticated] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  useEffect(() => {
    // Check if user is authenticated before loading data
    if (user) {
      console.log('User authenticated, loading data...', user);
      loadData();
    } else {
      console.log('User not authenticated yet, waiting...');
    }
  }, [user]);

  useEffect(() => {
    if (!companyInfo.id || !companyEmail) return;
    checkIsEmailAuthenticated(companyEmail, companyInfo.id);
  }, [companyEmail, companyInfo.id])

  // Monitor reportConfig state changes
  useEffect(() => {
    console.log('ReportConfig state changed:', reportConfig);
  }, [reportConfig]);

  const getCurrentCompanyId = useCallback(async (): Promise<string> => {
    // First try to get from localStorage userData
    try {
      const userData = localStorage.getItem('userData');
      if (userData) {
        const parsedUserData = JSON.parse(userData);
        if (parsedUserData.company_id) {
          console.log('Using company_id from localStorage:', parsedUserData.company_id);
          return parsedUserData.company_id;
        }
      }
    } catch (error) {
      console.warn('Error reading userData from localStorage:', error);
    }

    // Fallback to user from Redux
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Get company ID from user data
    if (!user.company_id) {
      throw new Error('Company ID not found');
    }
    
         console.log('Using company_id from Redux user:', user.company_id);
     return user.company_id;
   }, [user]);

   const checkAuthentication = useCallback(async (): Promise<boolean> => {
     return !!user;
   }, [user]);

   // Helper function to load report configs with company filtering
   const loadReportConfigsByCompany = async (companyId: string) => {
     try {
       console.log('Loading report configs with company filtering for:', companyId);
       
       // First try to load with company_id filter
       const { data: companyFilteredData, error: companyFilteredError } = await supabase
         .from('report_config')
         .select('*')
         .eq('company_id', companyId)
         .order('report_category', { ascending: true });

       if (companyFilteredError) {
         console.warn('Error loading company-filtered report configs:', companyFilteredError);
         console.log('Falling back to loading all report configs...');
         
         // Fallback: Load all report configs if company filtering fails
         const { data: allReportData, error: allReportError } = await supabase
           .from('report_config')
           .select('*')
           .order('report_category', { ascending: true });

         if (allReportError) {
           console.error('Error loading all report configs:', allReportError);
           return { data: null, error: allReportError, isCompanyFiltered: false };
         }
         
         console.log('Successfully loaded all report configs (fallback):', allReportData?.length || 0, 'records');
         return { data: allReportData, error: null, isCompanyFiltered: false };
       }
       
       // Successfully loaded company-filtered data
       console.log('Successfully loaded company-filtered report configs:', companyFilteredData?.length || 0, 'records');
       return { data: companyFilteredData, error: null, isCompanyFiltered: true };
       
     } catch (error) {
       console.error('Unexpected error loading report configs:', error);
       return { data: null, error, isCompanyFiltered: false };
     }
   };



  const loadData = useCallback(async () => {
    console.log('loadData called, user:', user);
    setIsLoading(true);
    try {
      // Check authentication first
      const isAuthenticated = await checkAuthentication();
      console.log('Authentication check result:', isAuthenticated);
      if (!isAuthenticated) {
        console.log('User not authenticated, skipping data load');
        setIsLoading(false);
        return;
      }

      const companyId = await getCurrentCompanyId();
      console.log('Company ID:', companyId);
      
      // Load company information
      const { data: companyData, error: companyError } = await supabase
        .from('company_master')
        .select('*')
        .eq('id', companyId)
        .single();
      
      console.log('Company data result:', { companyData, companyError });

      if (companyError && companyError.code !== 'PGRST116') {
        throw companyError;
      }

      // Create default company data if none exists
      const company: ICompany = companyData || {
        id: companyId,
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
        tax_percentage: null
      };

             // Load report configurations by company ID using helper function
       console.log('Loading report configurations for company:', companyId);
       let reportData = null;
       const reportConfigResult = await loadReportConfigsByCompany(companyId);
       
       if (reportConfigResult.error) {
         toast.error('Failed to load report configurations');
         reportData = null;
       } else {
         reportData = reportConfigResult.data;
         if (reportConfigResult.isCompanyFiltered) {
           console.log('Successfully loaded company-filtered report configs:', reportData?.length || 0, 'records');
           console.log('Data filtered by company_id:', companyId);
         } else {
           console.log('Loaded report configs without company filtering (fallback):', reportData?.length || 0, 'records');
           console.log('Note: Showing all configs due to company_id filtering issue');
         }
       }

      console.log('Final report config data:', reportData);

      // Process report config data - map to existing records from your table
      let poReport = { id: '', company_id: companyId, report_type: 'purchase_order', payment_details: '', remarks: '', report_footer: '', created_at: new Date().toISOString()};
      let salesReport = { id: '', company_id: companyId, report_type: 'sales', payment_details: '', remarks: '', report_footer: '', created_at: new Date().toISOString() };
      let stockReport = { id: '', company_id: companyId, report_type: 'stock', payment_details: '', remarks: '', report_footer: '', created_at: new Date().toISOString() };

      if (reportData && Array.isArray(reportData) && reportData.length > 0) {
        console.log('Processing report config data...');
        console.log('Available report configs:', reportData.map(config => ({
          id: config.id,
          company_id: config.company_id,
          category: config.report_category,
          key: config.report_config_key,
          value: config.report_config_value
        })));
        // Map the specific records by category and key (more reliable than hardcoded IDs)
        const paymentDetailsConfig = reportData.find(config => 
          config.report_category === 'PURCHASE_ORDER_REPORT' && config.report_config_key === 'PAYMENT_DETAILS'
        );
        const poRemarksConfig = reportData.find(config => 
          config.report_category === 'PURCHASE_ORDER_REPORT' && config.report_config_key === 'REMARKS'
        );
        const poFooterConfig = reportData.find(config => 
          config.report_category === 'PURCHASE_ORDER_REPORT' && config.report_config_key === 'FOOTER'
        );
        const salesRemarksConfig = reportData.find(config => 
          config.report_category === 'SALES_REPORT' && config.report_config_key === 'REMARKS'
        );
        const salesFooterConfig = reportData.find(config => 
          config.report_category === 'SALES_REPORT' && config.report_config_key === 'FOOTER'
        );
        const stockRemarksConfig = reportData.find(config => 
          config.report_category === 'STOCK_REPORT' && config.report_config_key === 'REMARKS'
        );
        const stockFooterConfig = reportData.find(config => 
          config.report_category === 'STOCK_REPORT' && config.report_config_key === 'FOOTER'
        );

        console.log('Found configs by category/key:', {
          paymentDetails: { id: paymentDetailsConfig?.id, company_id: paymentDetailsConfig?.company_id },
          poRemarks: { id: poRemarksConfig?.id, company_id: poRemarksConfig?.company_id },
          poFooter: { id: poFooterConfig?.id, company_id: poFooterConfig?.company_id },
          salesRemarks: { id: salesRemarksConfig?.id, company_id: salesRemarksConfig?.company_id },
          salesFooter: { id: salesFooterConfig?.id, company_id: salesFooterConfig?.company_id },
          stockRemarks: { id: stockRemarksConfig?.id, company_id: stockRemarksConfig?.company_id },
          stockFooter: { id: stockFooterConfig?.id, company_id: stockFooterConfig?.company_id }
        });

        // Build Purchase Order Report
        poReport = {
          id: 'purchase_order_report',
          company_id: companyId,
          report_type: 'purchase_order',
          payment_details: paymentDetailsConfig?.report_config_value || '',
          remarks: poRemarksConfig?.report_config_value || '',
          report_footer: poFooterConfig?.report_config_value || '',
          created_at: new Date().toISOString(),
        };

        // Build Sales Report
        salesReport = {
          id: 'sales_report',
          company_id: companyId,
          report_type: 'sales',
          payment_details: '',
          remarks: salesRemarksConfig?.report_config_value || '',
          report_footer: salesFooterConfig?.report_config_value || '',
          created_at: new Date().toISOString(),
        };

        // Build Stock Report
        stockReport = {
          id: 'stock_report',
          company_id: companyId,
          report_type: 'stock',
          payment_details: '',
          remarks: stockRemarksConfig?.report_config_value || '',
          report_footer: stockFooterConfig?.report_config_value || '',
          created_at: new Date().toISOString(),
        };

        console.log('Loaded report configs:', {
          poReport,
          salesReport,
          stockReport
        });

        console.log('Mapped report values:', {
          poPaymentDetails: paymentDetailsConfig?.report_config_value,
          poRemarks: poRemarksConfig?.report_config_value,
          poFooter: poFooterConfig?.report_config_value,
          salesRemarks: salesRemarksConfig?.report_config_value,
          salesFooter: salesFooterConfig?.report_config_value,
          stockRemarks: stockRemarksConfig?.report_config_value,
          stockFooter: stockFooterConfig?.report_config_value
        });
      }

      // Update component state with loaded data
      setCompanyInfo({
        ...company,
        description: company.description || ''
      });

      setCompanyEmail(companyData?.email ?? null);

      setReportConfig({
        purchaseOrderReport: poReport,
        salesReport: salesReport,
        stockReport: stockReport
      });

      console.log('State updated with report config:', {
        purchaseOrderReport: poReport,
        salesReport: salesReport,
        stockReport: stockReport
      });

    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load company data');
    } finally {
      setIsLoading(false);
    }
  }, [user, checkAuthentication, getCurrentCompanyId]);

  const checkIsEmailAuthenticated = async (
    companyEmail: string,
    companyId: string
  ): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from("system_settings")
        .select("id, system_config_value")
        .eq("company_email", companyEmail) // use parameter instead of hardcoding
        .eq("company_id", companyId)
        .eq("system_config_key", "EMAIL_REFRESH_TOKEN")
        .maybeSingle();

      if (error) {
        console.error("Supabase error:", error);
        return false;
      }

      if (data?.system_config_value) {
        setEmailRefreshToken(data.system_config_value);
        setIsEmailAuthenticated(true);
        return true;
      } else {
        setEmailRefreshToken("");
        setIsEmailAuthenticated(false);
        return false;
      }
    } catch (err) {
      console.error("Check email auth error:", err);
      return false;
    }
  };

  const toggleSection = (section: string) => {
    if (expandedSections.has(section)) {
      // If the section is already open, close it
      setExpandedSections(new Set());
    } else {
      // If the section is closed, open it and close all others
      setExpandedSections(new Set([section]));
    }
  };

  const toggleReportSection = (section: string) => {
    if (expandedReportSections.has(section)) {
      // If the section is already open, close it
      setExpandedReportSections(prev => {
        const newSet = new Set(prev);
        newSet.delete(section);
        return newSet;
      });
    } else {
      // If the section is closed, open it (can have multiple open)
      setExpandedReportSections(prev => new Set([...prev, section]));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Company Information validation
    if (!companyInfo.name.trim()) newErrors.name = 'Company name is required';
    if (!companyInfo.email?.trim()) newErrors.email = 'Email is required';
    if (companyInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyInfo.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (companyInfo.email && /[A-Z]/.test(companyInfo.email)) {
      newErrors.email = 'Email must be in lowercase';
    }
    if (companyInfo.phone && !/^[+]?[1-9][\d]{0,15}$/.test(companyInfo.phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Invalid phone number format';
    }
    if (companyInfo.bank_account_number && !/^\d+$/.test(companyInfo.bank_account_number)) {
      newErrors.bank_account_number = 'Bank account number must contain only numbers';
    }

    // Note: System Settings validation removed since email_url and email_token are not editable in the UI
    // These fields are managed through the email authentication process

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    console.log('handleSave function called!'); // Debug log
    if (!validateForm()) {
      console.log('Form validation failed, errors:', errors); // Debug log
      return;
    }

    console.log('Form validation passed, proceeding with save...'); // Debug log
    setIsLoading(true);

    try {
      const companyId = await getCurrentCompanyId();
      const now = new Date().toISOString();

      // Only save the company description text, not the admin config data
      const companyDataToSave = {
        ...companyInfo,
        description: companyInfo.description || '', // Just the plain text description
        modified_at: now
      };

      // Save company information
      let companyResult;
      if (companyInfo.id) {
        // Update existing company
        const { data: updatedCompany, error: companyError } = await supabase
          .from('company_master')
          .update(companyDataToSave)
          .eq('id', companyInfo.id)
          .select()
          .single();

        if (companyError) throw companyError;
        companyResult = updatedCompany;
      } else {
        // Create new company
        const { data: newCompany, error: companyError } = await supabase
          .from('company_master')
          .insert([{
            ...companyDataToSave,
            id: companyId,
            created_at: now
          }])
          .select()
          .single();

        if (companyError) throw companyError;
        companyResult = newCompany;
      }

                   // Save report configurations with proper company_id handling
       console.log('Saving report configurations for company:', companyId);
       
      // First, check if there are existing records for this company_id
      const { data: existingCompanyRecords, error: existingCompanyError } = await supabase
        .from('report_config')
        .select('*')
        .eq('company_id', companyId);

      if (existingCompanyError) {
        console.error('Error checking existing company records:', existingCompanyError);
        toast.error('Failed to check existing report configurations');
        return;
      }

      console.log('Existing records for company:', companyId, 'Count:', existingCompanyRecords?.length || 0);

      // Define all required report configurations
      const requiredConfigs = [
        {
          category: 'PURCHASE_ORDER_REPORT',
          key: 'PAYMENT_DETAILS',
          value: reportConfig.purchaseOrderReport.payment_details || '',
          description: 'Payment details'
        },
        {
          category: 'PURCHASE_ORDER_REPORT',
          key: 'REMARKS',
          value: reportConfig.purchaseOrderReport.remarks || '',
          description: 'Remarks'
        },
        {
          category: 'PURCHASE_ORDER_REPORT',
          key: 'FOOTER',
          value: reportConfig.purchaseOrderReport.report_footer || '',
          description: 'Footer'
        },
        {
          category: 'SALES_REPORT',
          key: 'REMARKS',
          value: reportConfig.salesReport.remarks || '',
          description: 'Remarks'
        },
        {
          category: 'SALES_REPORT',
          key: 'FOOTER',
          value: reportConfig.salesReport.report_footer || '',
          description: 'Footer'
        },
        {
          category: 'STOCK_REPORT',
          key: 'REMARKS',
          value: reportConfig.stockReport.remarks || '',
          description: 'Remarks'
        },
        {
          category: 'STOCK_REPORT',
          key: 'FOOTER',
          value: reportConfig.stockReport.report_footer || '',
          description: 'Footer'
        }
      ];

      // Process each required configuration
      for (const config of requiredConfigs) {
        try {
          // Check if this specific config already exists for this company
          const existingRecord = existingCompanyRecords?.find(record => 
            record.report_category === config.category && 
            record.report_config_key === config.key
          );

          if (existingRecord) {
            // Update existing record
            console.log(`Updating existing ${config.category} - ${config.key} for company ${companyId}`);
                 const { error: updateError } = await supabase
                   .from('report_config')
              .update({
                report_config_value: config.value,
                description: config.description,
                // modified_at: now
              })
              .eq('id', existingRecord.id);
                 
                 if (updateError) {
              console.error(`Error updating ${config.category} - ${config.key}:`, updateError);
              toast.error(`Failed to update ${config.category} - ${config.key}`);
                 } else {
              console.log(`Successfully updated ${config.category} - ${config.key}`);
         }
       } else {
            // Create new record for this company
            console.log(`Creating new ${config.category} - ${config.key} for company ${companyId}`);
            const { error: insertError } = await supabase
                    .from('report_config')
                    .insert([{
                company_id: companyId,
                report_category: config.category,
                report_config_key: config.key,
                report_config_value: config.value,
                description: config.description,
                      created_at: now
              }]);
                 
                 if (insertError) {
              console.error(`Error creating ${config.category} - ${config.key}:`, insertError);
              toast.error(`Failed to create ${config.category} - ${config.key}`);
                 } else {
              console.log(`Successfully created ${config.category} - ${config.key} for company ${companyId}`);
                 }
               }
             } catch (error) {
          console.error(`Unexpected error processing ${config.category} - ${config.key}:`, error);
          toast.error(`Error processing ${config.category} - ${config.key}`);
           }
         }

      // Update local state with the returned data
      setCompanyInfo(companyResult);

      // Update company data in localStorage
      const userDataString = localStorage.getItem('userData');
      if (userDataString) {
        try {
          const userData = JSON.parse(userDataString);
          userData.company_data = companyResult; // Update company_data
          localStorage.setItem('userData', JSON.stringify(userData));
          console.log('LocalStorage user company_data updated');
        } catch (err) {
          console.error('Error updating localStorage user data:', err);
        }
      }
      
      // Creating system log
      const systemLogs = {
        company_id: companyId,
        transaction_date: new Date().toISOString(),
        module: 'Company Administration',
        scope: 'Edit',
        key: '',
        log: `Company administration data updated.`,
        action_by: user?.id,
        created_at: new Date().toISOString(),
      }

      const { error: systemLogError } = await supabase
        .from('system_log')
        .insert(systemLogs);

      if (systemLogError) throw systemLogError;
      toast.success('All data saved successfully!');
    } catch (error) {
      console.error('Error saving data:', error);
      toast.error('Failed to save data');
    } finally {
      setIsLoading(false);
    }
  };

  const renderSaveButton = () => {
    console.log('renderSaveButton called, isLoading:', isLoading); // Debug log
    return (
      <Button
        onClick={(e) => {
          console.log('Save button clicked!', e); // Debug log
          e.preventDefault();
          e.stopPropagation();
          handleSave();
        }}
        disabled={isLoading}
        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors duration-200 flex items-center gap-2 save-button"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
  };


  // Handle authenticate email
  const authenticateEmail = async (company_id: string, user_id: string) => {
    setIsAuthenticating(true);
    const redirectUrl = window.location.href;
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/auth-email?user_id=${user_id}&company_id=${company_id}&redirect_url=${encodeURIComponent(redirectUrl)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
        }
      );

      const data = await res.json();
      if (data.url) {
        setIsAuthenticating(false);
        // Redirect browser to Google consent screen
        window.location.href = data.url;
      } else {
        console.error("No auth URL returned", data);
        setIsAuthenticating(false);
      }
    } catch (err) {
      console.error("Error fetching auth URL:", err);
      toast.error("Error fetching auth URL");
      setIsAuthenticating(false)
    }
  };

  // Show loading state if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 fade-in">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Loading Authentication...</h2>
              <p className="text-gray-500">Please wait while we verify your credentials</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show error if user doesn't have company_id
  if (!user?.company_id) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 fade-in">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Company Access Required</h2>
              <p className="text-gray-500 mb-4">Your account is not associated with a company.</p>
              <p className="text-sm text-gray-400">Please contact your administrator to set up company access.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6 fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Administration</h1>
          <p className="text-gray-600">Manage company details, system settings, and report customization</p>
        </div>
        
        {/* Authentication Status */}
        {/* {!isLoading && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-blue-700">
                Company Administration Dashboard - All changes are automatically saved to your company profile
              </span>
            </div>
        
            <div className="mt-2 p-2 bg-blue-100 rounded text-xs text-blue-800">
              <strong>Debug Info:</strong> User ID: {user.id}, Company ID: {user.company_id}, Email: {user.email}
            </div>
          </div>
        )} */}

        {/* Action Bar */}
        <div className="mb-6 flex justify-between items-center">
          <div className="text-sm text-gray-500">
          </div>
          <div className="flex gap-2">
            <Button
              onClick={loadData}
              variant="outline"
              size="sm"
              className="text-blue-600 border-blue-600 hover:bg-blue-50"
            >
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Accordion Sections */}
        <div className="space-y-6">
          {/* Information Section */}
          <Card className="shadow-sm border-gray-200 accordion-section">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors duration-200 accordion-header"
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Basic Information</h3>
                    
                    <div className="form-field">
                      <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                        Company Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="name"
                        value={companyInfo.name}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
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
                        onChange={(e) => setCompanyInfo({ ...companyInfo, description: e.target.value })}
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
                        value={companyInfo.email || ''}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
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
                          onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                          className={`mt-1 ${errors.phone ? 'border-red-500' : ''}`}
                          placeholder="Enter phone number"
                        />
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                      </div>
                    </div>
                  </div>

                  {/* Address Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Address Information</h3>
                    
                    <div className="form-field">
                      <Label htmlFor="address" className="text-sm font-medium text-gray-700">
                        Address
                      </Label>
                      <Textarea
                        id="address"
                        value={companyInfo.address || ''}
                        onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                        className="mt-1"
                        placeholder="Enter company address"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-field">
                        <Label htmlFor="city" className="text-sm font-medium text-gray-700">
                          City
                        </Label>
                        <Input
                          id="city"
                          value={companyInfo.city || ''}
                          onChange={(e) => setCompanyInfo({ ...companyInfo, city: e.target.value })}
                          className="mt-1"
                          placeholder="Enter city"
                        />
                      </div>
                      <div className="form-field">
                        <Label htmlFor="state" className="text-sm font-medium text-gray-700">
                          State
                        </Label>
                        <Input
                          id="state"
                          value={companyInfo.state || ''}
                          onChange={(e) => setCompanyInfo({ ...companyInfo, state: e.target.value })}
                          className="mt-1"
                          placeholder="Enter state"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-field">
                        <Label htmlFor="postal_code" className="text-sm font-medium text-gray-700">
                          Postal Code
                        </Label>
                        <Input
                          id="postal_code"
                          value={companyInfo.postal_code || ''}
                          onChange={(e) => setCompanyInfo({ ...companyInfo, postal_code: e.target.value })}
                          className="mt-1"
                          placeholder="Enter postal code"
                        />
                      </div>
                      <div className="form-field">
                        <Label htmlFor="country" className="text-sm font-medium text-gray-700">
                          Country
                        </Label>
                        <Input
                          id="country"
                          value={companyInfo.country || ''}
                          onChange={(e) => setCompanyInfo({ ...companyInfo, country: e.target.value })}
                          className="mt-1"
                          placeholder="Enter country"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Banking Information */}
                  <div className="space-y-4 md:col-span-2">
                    <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Banking Information</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="form-field">
                        <Label htmlFor="bank_name" className="text-sm font-medium text-gray-700">
                          Bank Name
                        </Label>
                        <Input
                          id="bank_name"
                          value={companyInfo.bank_name || ''}
                          onChange={(e) => setCompanyInfo({ ...companyInfo, bank_name: e.target.value })}
                          className="mt-1"
                          placeholder="Enter bank name"
                        />
                      </div>

                      <div className="form-field">
                        <Label htmlFor="bank_account_number" className="text-sm font-medium text-gray-700">
                          Bank Account Number
                        </Label>
                        <Input
                          id="bank_account_number"
                          value={companyInfo.bank_account_number || ''}
                          onChange={(e) => setCompanyInfo({ ...companyInfo, bank_account_number: e.target.value })}
                          className={`mt-1 ${errors.bank_account_number ? 'border-red-500' : ''}`}
                          placeholder="Enter account number"
                        />
                        {errors.bank_account_number && <p className="text-red-500 text-xs mt-1">{errors.bank_account_number}</p>}
                      </div>

                      <div className="form-field">
                        <Label htmlFor="ifsc_code" className="text-sm font-medium text-gray-700">
                          IFSC Code
                        </Label>
                        <Input
                          id="ifsc_code"
                          value={companyInfo.ifsc_code || ''}
                          onChange={(e) => setCompanyInfo({ ...companyInfo, ifsc_code: e.target.value })}
                          className="mt-1"
                          placeholder="Enter IFSC code"
                        />
                      </div>

                      <div className="form-field">
                        <Label htmlFor="iban_code" className="text-sm font-medium text-gray-700">
                          IBAN Code
                        </Label>
                        <Input
                          id="iban_code"
                          value={companyInfo.iban_code || ''}
                          onChange={(e) => setCompanyInfo({ ...companyInfo, iban_code: e.target.value })}
                          className="mt-1"
                          placeholder="Enter IBAN code"
                        />
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
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Settings Section */}
          <Card className="shadow-sm border-gray-200 accordion-section">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors duration-200 accordion-header"
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
                      value={companyEmail ?? ""}
                      // onChange={(e) => setSystemSettings({ ...systemSettings, email_url: e.target.value })}
                      className={`mt-1 ${errors.email_url ? 'border-red-500' : ''}`}
                      placeholder="Enter email service URL"
                      readOnly
                    />
                    {errors.email_url && <p className="text-red-500 text-xs mt-1">{errors.email_url}</p>}
                  </div>

                  <div>
                    {isEmailAuthenticated && emailRefreshToken ? (
                      <p className="text-green-600 flex text-sm">
                        <ShieldCheck className='h-5 w-5 mr-1' /> Email is verified & authenticated.
                      </p>
                    ) : (
                      <>
                        <Button
                          type="button"
                          onClick={() => authenticateEmail(companyInfo.id, user.id)}
                          disabled={isAuthenticating}
                          className="text-white bg-blue-600 hover:bg-blue-700 transition-all duration-300 transform hover:scale-105 shadow-md hover:shadow-lg me-2"
                        >
                          {isAuthenticating ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Authenticating...
                            </span>
                          ) : (<span className="flex items-center">
                            Authenticate Email
                          </span>
                          )}
                        </Button>
                        <p className="text-gray-600 flex text-xs mt-2">
                          <Info className='h-4 w-4 mr-1' /> Emails can only be sent from authenticated email addresses.
                        </p>
                      </>
                    )}
                  </div>
                  {/* <div className="form-field">
                    <Label htmlFor="email_token" className="text-sm font-medium text-gray-700">
                      Email Token *
                    </Label>
                    <Input
                      id="email_token"
                      type="password"
                      value={systemSettings.email_token}
                      onChange={(e) => setSystemSettings({ ...systemSettings, email_token: e.target.value })}
                      className={`mt-1 ${errors.email_token ? 'border-red-500' : ''}`}
                      placeholder="Enter email service token"
                    />
                    {errors.email_token && <p className="text-red-500 text-xs mt-1">{errors.email_token}</p>}
                  </div> */}
                </div>
              </CardContent>
            )}
          </Card>

          {/* Customization Section */}
          <Card className="shadow-sm border-gray-200 accordion-section">
            <CardHeader 
              className="cursor-pointer hover:bg-gray-50 transition-colors duration-200 accordion-header"
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
                  {/* Purchase Order Report */}
                  <div className="border border-gray-200 rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                      onClick={() => toggleReportSection('purchase_order')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-800">Purchase Order Report</h3>
                      </div>
                      {expandedReportSections.has('purchase_order') ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    
                    {expandedReportSections.has('purchase_order') && (
                      <div className="px-4 pb-4 space-y-4">
                        <div className="form-field">
                          <Label htmlFor="poPaymentDetails" className="text-sm font-medium text-gray-700">
                            Payment Details
                          </Label>
                          <Textarea
                            id="poPaymentDetails"
                            value={reportConfig.purchaseOrderReport.payment_details || ''}
                            onChange={(e) => setReportConfig({
                              ...reportConfig,
                              purchaseOrderReport: {
                                ...reportConfig.purchaseOrderReport,
                                payment_details: e.target.value
                              }
                            })}
                            className="mt-1"
                            placeholder="Enter payment details template"
                            rows={3}
                          />
                        </div>

                        <div className="form-field">
                          <Label htmlFor="poRemarks" className="text-sm font-medium text-gray-700">
                            Remarks
                          </Label>
                          <Textarea
                            id="poRemarks"
                            value={reportConfig.purchaseOrderReport.remarks || ''}
                            onChange={(e) => setReportConfig({
                              ...reportConfig,
                              purchaseOrderReport: {
                                ...reportConfig.purchaseOrderReport,
                                remarks: e.target.value
                              }
                            })}
                            className="mt-1"
                            placeholder="Enter remarks template"
                            rows={3}
                          />
                        </div>

                        <div className="form-field">
                          <Label htmlFor="poFooter" className="text-sm font-medium text-gray-700">
                            Report Footer
                          </Label>
                          <Textarea
                            id="poFooter"
                            value={reportConfig.purchaseOrderReport.report_footer || ''}
                            onChange={(e) => setReportConfig({
                              ...reportConfig,
                              purchaseOrderReport: {
                                ...reportConfig.purchaseOrderReport,
                                report_footer: e.target.value
                              }
                            })}
                            className="mt-1"
                            placeholder="Enter report footer template"
                            rows={3}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sales Report */}
                  <div className="border border-gray-200 rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                      onClick={() => toggleReportSection('sales')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-800">Sales Report</h3>
                      </div>
                      {expandedReportSections.has('sales') ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    
                    {expandedReportSections.has('sales') && (
                      <div className="px-4 pb-4 space-y-4">
                        <div className="form-field">
                          <Label htmlFor="salesRemarks" className="text-sm font-medium text-gray-700">
                            Remarks
                          </Label>
                          <Textarea
                            id="salesRemarks"
                            value={reportConfig.salesReport.remarks || ''}
                            onChange={(e) => setReportConfig({
                              ...reportConfig,
                              salesReport: {
                                ...reportConfig.salesReport,
                                remarks: e.target.value
                              }
                            })}
                            className="mt-1"
                            placeholder="Enter remarks template"
                            rows={3}
                          />
                        </div>

                        <div className="form-field">
                          <Label htmlFor="salesFooter" className="text-sm font-medium text-gray-700">
                            Report Footer
                          </Label>
                          <Textarea
                            id="salesFooter"
                            value={reportConfig.salesReport.report_footer || ''}
                            className="mt-1"
                            placeholder="Enter report footer template"
                            rows={3}
                            onChange={(e) => setReportConfig({
                              ...reportConfig,
                              salesReport: {
                                ...reportConfig.salesReport,
                                report_footer: e.target.value
                              }
                            })}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stock Report */}
                  <div className="border border-gray-200 rounded-lg">
                    <div 
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                      onClick={() => toggleReportSection('stock')}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <h3 className="text-lg font-semibold text-gray-800">Stock Report</h3>
                      </div>
                      {expandedReportSections.has('stock') ? (
                        <ChevronDown className="h-5 w-5 text-gray-500" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    
                    {expandedReportSections.has('stock') && (
                      <div className="px-4 pb-4 space-y-4">
                        <div className="form-field">
                          <Label htmlFor="stockRemarks" className="text-sm font-medium text-gray-700">
                            Remarks
                          </Label>
                          <Textarea
                            id="stockRemarks"
                            value={reportConfig.stockReport.remarks || ''}
                            onChange={(e) => setReportConfig({
                              ...reportConfig,
                              stockReport: {
                                ...reportConfig.stockReport,
                                remarks: e.target.value
                              }
                            })}
                            className="mt-1"
                            placeholder="Enter remarks template"
                            rows={3}
                          />
                        </div>

                        <div className="form-field">
                          <Label htmlFor="stockFooter" className="text-sm font-medium text-gray-700">
                            Report Footer
                          </Label>
                          <Textarea
                            id="stockFooter"
                            value={reportConfig.stockReport.report_footer || ''}
                            onChange={(e) => setReportConfig({
                              ...reportConfig,
                              stockReport: {
                                ...reportConfig.stockReport,
                                report_footer: e.target.value
                              }
                            })}
                            className="mt-1"
                            placeholder="Enter report footer template"
                            rows={3}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </div>

        {/* Bottom Action Bar */}
        <div className="mt-8 flex justify-end">
          {renderSaveButton()}
        </div>
      </div>
    </div>
  );
};

export default CompanyAdministration;
