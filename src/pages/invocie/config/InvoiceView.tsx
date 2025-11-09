import { useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/Utils/types/supabaseClient';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Printer } from "lucide-react";
import generateInvoicePDF from './InvoicePrintTemplate';
import { IUser } from '@/Utils/constants';
import { useAppSelector } from '@/hooks/redux';
import { formatCurrency } from '@/Utils/formatters';

interface InvoiceItem {
  id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
}

interface Company {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  modified_at: string;
}

interface SalesInvoice {
  id: string;
  invoice_number: string;
  customer_name: string;
  contact_number: string;
  invoice_date: string;
  net_amount: number;
  status: "paid" | "pending" | "overdue";
  billing_address: string;
  email: string;
  total_items: number;
  invoice_amount: number;
  discount_amount: number;
  company: Company;
  items: InvoiceItem[];
}

export default function InvoiceView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<SalesInvoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const userInfo = useAppSelector((state) => state.user.userData);

  useEffect(() => {
    const fetchInvoice = async () => {
      if (!id) {
        setError('Invoice ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const user = localStorage.getItem('userData');
        const userData: IUser | null = user ? JSON.parse(user) : null;
        const companyId = userData?.company_id || null;

        const { data, error: rpcError } = await supabase.rpc('get_sales_invoices_by_id', {
          company_id_param: companyId!,
          search_query: '',
          status_filter: 'all',
          date_from: undefined,
          date_to: undefined,
          page: 1,
          limit_param: 100,
          sort_field: 'invoice_number',
          sort_order: 'asc'
        });

        if (rpcError) {
          console.error('RPC Error:', rpcError);
          setError(`Failed to fetch invoice: ${rpcError.message}`);
          return;
        }

        if (!data || !(data as any).invoices) {
          setError('No invoice data found');
          return;
        }

        const foundInvoice = (data as any).invoices.find((inv: SalesInvoice) => inv.id === id);
        if (!foundInvoice) {
          setError('Invoice not found');
          return;
        }

        setInvoice(foundInvoice);
      } catch (err) {
        console.error('Error fetching invoice:', err);
        setError('An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoice();
  }, [id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handlePrint = () => {
    if (!invoice) return;

    const invoiceData = {
      id: invoice.id,
      invoiceNumber: invoice.invoice_number,
      customer: {
        name: invoice.customer_name,
        contact: invoice.contact_number,
        address: invoice.billing_address,
      },
      companyInfo: {
        ...userInfo?.company_data,
      },
      store: {
        name: invoice.company.name,
        branch: "Main Branch",
        address: invoice.billing_address,
        contact: invoice.contact_number
      },
      vehicle: {
        plateNo: "N/A",
        kms: "N/A",
        brand: "N/A",
        model: "N/A",
        vinNo: "N/A",
        emirates: "N/A",
      },
      insurance: {
        provider: "N/A",
        claimNo: "N/A",
        lpoNo: "N/A",
      },
      paymentType: "Cash",
      items: invoice.items.map(item => ({
        id: item.id,
        itemNumber: item.item_id,
        name: item.item_name,
        description: "",
        quantity: item.quantity,
        unitPrice: item.unit_price,
        sellingPrice: item.unit_price,
        amount: item.quantity * item.unit_price,
        discount: (item.discount_percentage / 100) * (item.quantity * item.unit_price),
        grossAmount: item.quantity * item.unit_price,
        vat: (item.quantity * item.unit_price) * 0.05,
        netAmount: (item.quantity * item.unit_price) * 1.05,
      })),
      date: invoice.invoice_date,
      status: invoice.status,
      paymentDetails: {
        type: "Cash",
        terms: "Net 30"
      }
    };

    generateInvoicePDF(invoiceData);
  };

  const calculateGrossTotal = () => {
    return invoice?.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0) || 0;
  };

  const calculateTotalDiscount = () => {
    return invoice?.items.reduce((sum, item) => {
      const itemTotal = item.quantity * item.unit_price;
      const discount = (item.discount_percentage / 100) * itemTotal;
      return sum + discount;
    }, 0) || 0;
  };

  const calculateSubtotal = () => {
    return calculateGrossTotal() - calculateTotalDiscount();
  };

  const grossTotal = calculateGrossTotal();
  const totalDiscount = calculateTotalDiscount();
  const subtotal = calculateSubtotal();
  const tax = 0;
  const finalAmount = subtotal + tax;

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading invoice...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-6xl mx-auto flex items-center justify-center min-h-[400px]">
          <Card className="border-none shadow-lg">
            <CardContent className="p-6 text-center">
              <p className="text-red-600 mb-4">{error || 'Invoice not found'}</p>
              <Button onClick={() => navigate('/dashboard/invoice')} className="bg-blue-600 hover:bg-blue-700">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Invoices
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen print:p-0 print:bg-white">
      <div className="max-w-6xl mx-auto space-y-6 print:space-y-0">
        <div className="flex items-center justify-between print:hidden">
           <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => window.history.back()}
                      className="hover:bg-blue-100 transition-colors duration-200 rounded-full"
                    >
                      <ArrowLeft className="h-5 w-5 text-blue-600" />
                    </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="border-blue-600 text-blue-600 hover:bg-blue-50"
          >
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
        </div>

        <Card className="border-none shadow-lg print:shadow-none print:border-none">
          <CardContent className="p-6 print:p-8">
            <div id="invoice-content" className="space-y-8 print:min-h-[29.7cm]">
              {/* Header Section */}
              <div className="flex justify-between items-start border-b border-gray-200 pb-6 print:pb-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-blue-800">{userInfo?.company_data.name}</h1>
                  <p className="text-gray-600">{userInfo?.company_data.description}</p>
                  <p className="text-gray-600">{userInfo?.company_data.address}</p>
                  <p className="text-gray-600">{userInfo?.company_data.city}, {userInfo?.company_data.state}, {userInfo?.company_data.postal_code}</p>
                  <p className="text-gray-600">Phone: {userInfo?.company_data.phone}</p>
                  {invoice.email && <p className="text-gray-600">Email: {userInfo?.company_data.email}</p>}
                </div>
                <div className="text-right space-y-2">
                  <h2 className="text-2xl font-bold text-gray-900">INVOICE</h2>
                  <p className="text-gray-600">Invoice #: {invoice.invoice_number}</p>
                  <p className="text-gray-600">Date: {new Date(invoice.invoice_date).toLocaleDateString()}</p>
                  <Badge className={`${getStatusColor(invoice.status)} px-3 py-1 text-sm font-semibold capitalize`}>
                    {invoice.status}
                  </Badge>
                </div>
              </div>

              {/* Bill To and Summary Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Bill To</h3>
                  <div className="border-l-4 border-blue-600 pl-4 space-y-1">
                    <p className="text-lg font-medium text-gray-800">{invoice.customer_name}</p>
                    <p className="text-gray-600">Contact: {invoice.contact_number}</p>
                    {invoice.email && <p className="text-gray-600">Email: {invoice.email}</p>}
                    {invoice.billing_address && <p className="text-gray-600">{invoice.billing_address}</p>}
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900">Invoice Summary</h3>
                  <div className="bg-gray-50 p-4 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Items:</span>
                      <span className="font-medium">{invoice.total_items}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Gross Amount:</span>
                      <span className="font-medium">{formatCurrency(grossTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Discount:</span>
                      <span className="font-medium text-green-600">-{formatCurrency(totalDiscount)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-3">
                      <span className="text-gray-800 font-semibold">Net Amount:</span>
                      <span className="font-bold text-blue-600">{formatCurrency(finalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-gray-900">Items</h3>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-blue-50">
                      <TableRow>
                        <TableHead className="text-sm font-medium text-blue-800">Item Name</TableHead>
                        <TableHead className="text-sm font-medium text-blue-800 text-center">Qty</TableHead>
                        <TableHead className="text-sm font-medium text-blue-800 text-right">Unit Price</TableHead>
                        <TableHead className="text-sm font-medium text-blue-800 text-center">Discount</TableHead>
                        <TableHead className="text-sm font-medium text-blue-800 text-right">Gross Amount</TableHead>
                        <TableHead className="text-sm font-medium text-blue-800 text-right">Net Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.items.map((item) => {
                        const grossAmount = item.quantity * item.unit_price;
                        const discountAmount = (item.discount_percentage / 100) * grossAmount;
                        const netAmount = grossAmount - discountAmount;

                        return (
                          <TableRow key={item.id} className="hover:bg-gray-50 transition-colors">
                            <TableCell className="font-medium text-gray-800">{item.item_name}</TableCell>
                            <TableCell className="text-center">{item.quantity}</TableCell>
                            <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                            <TableCell className="text-center">
                              {item.discount_percentage > 0 ? (
                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-semibold">
                                  {item.discount_percentage}%
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(grossAmount)}
                              {discountAmount > 0 && (
                                <div className="text-xs text-green-600">-{formatCurrency(discountAmount)}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(netAmount)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Totals Section */}
              <div className="flex justify-end">
                <div className="w-full max-w-md">
                  <div className="bg-gray-50 p-6 rounded-lg space-y-3">
                    <div className="flex justify-between text-gray-600">
                      <span>Gross Total:</span>
                      <span>{formatCurrency(grossTotal)}</span>
                    </div>
                    {totalDiscount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Total Discount:</span>
                        <span>-{formatCurrency(totalDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-800 font-semibold border-t pt-3">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Tax (0%):</span>
                      <span>{userInfo?.company_data?.currency}0.00</span>
                    </div>
                    <div className="flex justify-between font-bold text-lg text-blue-600 border-t-2 pt-3">
                      <span>Total Amount:</span>
                      <span>{formatCurrency(finalAmount)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Section */}
              <div className="border-t pt-6 print:pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-800">Payment Instructions</h4>
                    <p className="text-gray-600 text-sm">Please make payment via bank transfer to:</p>
                    <p className="text-gray-600 text-sm">Bank: {userInfo?.company_data?.bank_name}</p>
                    <p className="text-gray-600 text-sm">Account: {userInfo?.company_data?.bank_account_number}</p>
                    <p className="text-gray-600 text-sm">Reference: {invoice.invoice_number}</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-semibold text-gray-800">Terms & Conditions</h4>
                    <p className="text-gray-600 text-sm">
                      Payment is due within 30 days. Please include the invoice number as reference.
                      Late payments may incur additional charges.
                    </p>
                  </div>
                </div>
                <div className="text-center mt-6 text-gray-500 text-sm print:fixed print:bottom-0 print:left-0 print:right-0">
                  <p>Thank you for your business!</p>
                  <p>For any queries, please contact us at support@{invoice.company.name.toLowerCase().replace(/\s+/g, '')}.com</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}