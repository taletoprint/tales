"use client";

import { OrderDetails } from '@/app/success/page';

interface PrintReceiptProps {
  order: OrderDetails;
}

export function PrintReceipt({ order }: PrintReceiptProps) {
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>TaleToPrint - Order Receipt</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none; }
          }
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
            max-width: 600px;
            margin: 0 auto;
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
          }
          .logo {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 10px;
          }
          .receipt-title {
            font-size: 18px;
            color: #666;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-weight: bold;
            margin-bottom: 10px;
            font-size: 16px;
            color: #333;
          }
          .row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 4px 0;
          }
          .label {
            color: #666;
          }
          .value {
            font-weight: 500;
          }
          .divider {
            border-top: 1px solid #ddd;
            margin: 20px 0;
          }
          .total {
            font-size: 18px;
            font-weight: bold;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #333;
          }
          .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .image-preview {
            width: 200px;
            height: 200px;
            object-fit: cover;
            border-radius: 8px;
            margin: 20px auto;
            display: block;
            border: 1px solid #ddd;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">TaleToPrint</div>
          <div class="receipt-title">Order Receipt</div>
        </div>

        <div class="section">
          <div class="row">
            <span class="label">Order Number:</span>
            <span class="value">${order.id}</span>
          </div>
          <div class="row">
            <span class="label">Order Date:</span>
            <span class="value">${new Date().toLocaleDateString('en-GB', { 
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}</span>
          </div>
        </div>

        ${order.artworkDetails.imageUrl ? `
          <div class="section">
            <div class="section-title">Your Artwork</div>
            <img src="${order.artworkDetails.imageUrl}" alt="Ordered artwork" class="image-preview" />
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Product Details</div>
          <div class="row">
            <span class="label">Print Size:</span>
            <span class="value">${order.artworkDetails.printSize}</span>
          </div>
          <div class="row">
            <span class="label">Art Style:</span>
            <span class="value">${order.artworkDetails.style.replace('_', ' ')}</span>
          </div>
          <div class="row">
            <span class="label">Delivery:</span>
            <span class="value">Free UK Delivery</span>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Delivery Address</div>
          <div style="line-height: 1.6;">
            ${order.customerName}<br>
            ${order.shippingAddress.line1}<br>
            ${order.shippingAddress.line2 ? order.shippingAddress.line2 + '<br>' : ''}
            ${order.shippingAddress.city}, ${order.shippingAddress.postal_code}<br>
            ${order.shippingAddress.country}
          </div>
        </div>

        <div class="section">
          <div class="row">
            <span class="label">Estimated Delivery:</span>
            <span class="value">${order.estimatedDelivery}</span>
          </div>
        </div>

        <div class="divider"></div>

        <div class="total">
          <div class="row">
            <span>Total Paid:</span>
            <span>${order.currency === 'GBP' ? '£' : order.currency} ${order.amount}</span>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for your order!</p>
          <p>
            TaleToPrint Ltd<br>
            support@taletoprint.com<br>
            www.taletoprint.com
          </p>
          <p style="margin-top: 20px;">
            This receipt confirms your payment has been processed.<br>
            Please retain for your records.
          </p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();
    
    // Wait for images to load before printing
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.onafterprint = () => {
          printWindow.close();
        };
      }, 500);
    };
  };

  return (
    <button
      onClick={handlePrint}
      className="px-6 py-3 bg-warm-grey/20 text-charcoal rounded-xl hover:bg-warm-grey/30 transition-colors font-medium"
    >
      Print Receipt
    </button>
  );
}