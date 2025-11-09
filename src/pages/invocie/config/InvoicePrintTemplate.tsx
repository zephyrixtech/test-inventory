import { format } from 'date-fns';

interface InvoiceItem {
  id: string;
  itemNumber: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  grossAmount: number;
  netAmount: number;
}

interface InvoiceData {
  id: string;
  invoiceNumber: string;
  date: string;
  customer: {
    name: string;
    contact: string;
    address: string;
  };
  store: {
    name: string;
    contact: string;
  };
  items: InvoiceItem[];
  status: "paid" | "pending" | "overdue";
}

const formatNumber = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(num) ? "0.00" : num.toFixed(2);
};

const generateInvoicePDF = (data: InvoiceData) => {
  const formattedDate = format(new Date(data.date), 'dd-MM-yyyy');

  const calculateTotals = () => {
    const grossTotal = data.items.reduce((total, item) => total + item.grossAmount, 0);
    const totalDiscount = data.items.reduce((total, item) => total + item.discount, 0);
    const netTotal = data.items.reduce((total, item) => total + item.netAmount, 0);

    return {
      grossTotal: formatNumber(grossTotal),
      totalDiscount: formatNumber(totalDiscount),
      netTotal: formatNumber(netTotal)
    };
  };

  const totals = calculateTotals();
  const totalItems = data.items.length;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const itemRows = data.items.map((item, index) => `
    <tr>
      <td class="text-center">${index + 1}</td>
      <td class="item-name">${item.name}</td>
      <td class="text-center">${item.quantity}</td>
      <td class="text-right">$${formatNumber(item.unitPrice)}</td>
      <td class="text-right">$${formatNumber(item.grossAmount)}</td>
      <td class="text-center discount-cell">
        ${item.discount > 0 ? `$${formatNumber(item.discount)}` : '-'}
      </td>
      <td class="text-right font-semibold">$${formatNumber(item.netAmount)}</td>
    </tr>
  `).join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice #${data.invoiceNumber}</title>
        <style>
          @page {
            size: A4;
            margin: 15mm;
          }
          
          * {
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
            margin: 0;
            padding: 0;
            color: #1f2937;
            line-height: 1.5;
            font-size: 14px;
          }
          
          .invoice-container {
            max-width: 100%;
            margin: 0 auto;
          }
          
          /* Header */
          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
          }
          
          .company-info h1 {
            font-size: 28px;
            font-weight: bold;
            color: #1e40af;
            margin: 0 0 8px 0;
          }
          
          .company-info p {
            margin: 4px 0;
            color: #6b7280;
          }
          
          .invoice-details {
            text-align: right;
          }
          
          .invoice-details h2 {
            font-size: 24px;
            font-weight: bold;
            color: #111827;
            margin: 0 0 12px 0;
          }
          
          .invoice-details p {
            margin: 4px 0;
            color: #6b7280;
          }
          
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: 600;
            text-transform: capitalize;
            font-size: 12px;
            margin-top: 8px;
          }
          
          .status-paid { background-color: #dcfce7; color: #166534; }
          .status-pending { background-color: #fef3c7; color: #92400e; }
          .status-overdue { background-color: #fee2e2; color: #dc2626; }
          
          /* Customer Info */
          .customer-section {
            margin-bottom: 40px;
          }
          
          .customer-info {
            border-left: 4px solid #2563eb;
            padding-left: 16px;
            background-color: #f8fafc;
            padding: 16px;
            border-radius: 8px;
          }
          
          .customer-info h3 {
            font-size: 16px;
            font-weight: 600;
            color: #1e40af;
            margin: 0 0 12px 0;
          }
          
          .customer-info p {
            margin: 4px 0;
            color: #374151;
          }
          
          .customer-name {
            font-size: 16px;
            font-weight: 600;
            color: #111827;
          }
          
          /* Summary Box */
          .invoice-summary {
            background-color: #f1f5f9;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
            border: 1px solid #e2e8f0;
          }
          
          .summary-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          
          .summary-row:last-child {
            margin-bottom: 0;
            padding-top: 8px;
            border-top: 1px solid #cbd5e1;
            font-weight: 600;
            color: #1e40af;
          }
          
          .summary-label {
            color: #64748b;
          }
          
          .summary-value {
            font-weight: 500;
          }
          
          .discount-value {
            color: #059669;
          }
          
          /* Table */
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .items-table th {
            background-color: #eff6ff;
            color: #1e40af;
            font-weight: 600;
            padding: 12px 8px;
            text-align: left;
            font-size: 13px;
            border-bottom: 2px solid #dbeafe;
          }
          
          .items-table td {
            padding: 12px 8px;
            border-bottom: 1px solid #f1f5f9;
          }
          
          .items-table tbody tr:hover {
            background-color: #f8fafc;
          }
          
          .items-table tbody tr:last-child td {
            border-bottom: none;
          }
          
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-semibold { font-weight: 600; }
          
          .item-name {
            font-weight: 500;
            color: #111827;
          }
          
          .discount-cell {
            color: #059669;
            font-weight: 500;
          }
          
          /* Totals */
          .totals-section {
            margin-top: 40px;
            display: flex;
            justify-content: flex-end;
          }
          
          .totals-box {
            width: 350px;
            background-color: #f8fafc;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #e2e8f0;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 4px 0;
          }
          
          .total-row.final {
            border-top: 2px solid #cbd5e1;
            padding-top: 12px;
            margin-top: 12px;
            font-weight: bold;
            font-size: 16px;
            color: #1e40af;
          }
          
          .total-label {
            color: #64748b;
          }
          
          .total-value {
            font-weight: 500;
          }
          
          .discount-total {
            color: #059669;
          }
          
          /* Footer */
          .invoice-footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 13px;
          }
          
          .invoice-footer p {
            margin: 4px 0;
          }
          
          /* Print specific styles */
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .invoice-container {
              max-width: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <!-- Header -->
          <div class="invoice-header">
            <div class="company-info">
              <h1>${data.store.name}</h1>
              <p>Phone: ${data.store.contact}</p>
            </div>
            <div class="invoice-details">
              <h2>INVOICE</h2>
              <p><strong>Invoice #:</strong> ${data.invoiceNumber}</p>
              <p><strong>Date:</strong> ${formattedDate}</p>
              <span class="status-badge status-${data.status.toLowerCase()}">${data.status}</span>
            </div>
          </div>

          <!-- Customer Info & Summary -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
            <div class="customer-section">
              <div class="customer-info">
                <h3>Bill To</h3>
                <p class="customer-name">${data.customer.name}</p>
                <p>Contact: ${data.customer.contact}</p>
                ${data.customer.address ? `<p>${data.customer.address}</p>` : ''}
              </div>
            </div>
            
            <div class="invoice-summary">
              <div class="summary-row">
                <span class="summary-label">Total Items:</span>
                <span class="summary-value">${totalItems}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Gross Amount:</span>
                <span class="summary-value">$${totals.grossTotal}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Total Discount:</span>
                <span class="summary-value discount-value">-$${totals.totalDiscount}</span>
              </div>
              <div class="summary-row">
                <span>Net Amount:</span>
                <span>$${totals.netTotal}</span>
              </div>
            </div>
          </div>

          <!-- Items Table -->
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 60px;">#Sl No</th>
                <th>Item Name</th>
                <th style="width: 50px;">Qty</th>
                <th style="width: 80px;">Unit Price</th>
                <th style="width: 80px;">Gross Amount</th>
                <th style="width: 80px;">Discount</th>
                <th style="width: 90px;">Net Amount</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
            </tbody>
          </table>

          <!-- Totals Section -->
          <div class="totals-section">
            <div class="totals-box">
              <div class="total-row">
                <span class="total-label">Gross Total:</span>
                <span class="total-value">$${totals.grossTotal}</span>
              </div>
              <div class="total-row">
                <span class="total-label">Total Discount:</span>
                <span class="total-value discount-total">-$${totals.totalDiscount}</span>
              </div>
              <div class="total-row final">
                <span>Total Amount:</span>
                <span>$${totals.netTotal}</span>
              </div>
            </div>
          </div>

          <!-- Footer -->
          <div class="invoice-footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>This is a computer generated invoice</p>
          </div>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  
  // Wait for content to load before printing
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 250);
};

export default generateInvoicePDF;