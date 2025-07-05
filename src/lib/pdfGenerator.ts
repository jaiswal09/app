import jsPDF from 'jspdf';
import type { Bill } from '../types';

export const generateBillPDF = (bill: Bill) => {
  const doc = new jsPDF();
  
  // Set font
  doc.setFont('helvetica');
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('MedInventory', 20, 20);
  
  doc.setFontSize(16);
  doc.text('Invoice', 20, 30);
  
  // Bill information
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  
  doc.text(`Bill Number: ${bill.bill_number}`, 20, 45);
  doc.text(`Date: ${new Date(bill.bill_date).toLocaleDateString()}`, 20, 52);
  if (bill.due_date) {
    doc.text(`Due Date: ${new Date(bill.due_date).toLocaleDateString()}`, 20, 59);
  }
  
  // Customer information
  doc.setFontSize(12);
  doc.setTextColor(40, 40, 40);
  doc.text('Bill To:', 20, 75);
  
  doc.setFontSize(10);
  doc.text(bill.customer_name, 20, 85);
  if (bill.customer_email) {
    doc.text(bill.customer_email, 20, 92);
  }
  if (bill.customer_phone) {
    doc.text(bill.customer_phone, 20, 99);
  }
  if (bill.customer_address) {
    const addressLines = bill.customer_address.split('\n');
    addressLines.forEach((line, index) => {
      doc.text(line, 20, 106 + (index * 7));
    });
  }
  
  // Items table
  const startY = 130;
  let currentY = startY;
  
  // Table headers
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text('Item', 20, currentY);
  doc.text('Qty', 120, currentY);
  doc.text('Unit Price', 140, currentY);
  doc.text('Total', 170, currentY);
  
  // Draw header line
  doc.line(20, currentY + 2, 190, currentY + 2);
  currentY += 10;
  
  // Items
  bill.items?.forEach((item) => {
    doc.setFontSize(9);
    doc.text(item.item_name, 20, currentY);
    if (item.item_description) {
      doc.setTextColor(100, 100, 100);
      doc.text(item.item_description, 20, currentY + 5);
      currentY += 5;
    }
    
    doc.setTextColor(40, 40, 40);
    doc.text(item.quantity.toString(), 120, currentY);
    doc.text(`₹${item.unit_price.toLocaleString()}`, 140, currentY);
    doc.text(`₹${item.total_price.toLocaleString()}`, 170, currentY);
    
    currentY += 12;
  });
  
  // Totals
  currentY += 10;
  doc.line(120, currentY, 190, currentY);
  currentY += 10;
  
  doc.setFontSize(10);
  doc.text('Subtotal:', 140, currentY);
  doc.text(`₹${bill.subtotal.toLocaleString()}`, 170, currentY);
  currentY += 8;
  
  doc.text(`Tax (${bill.tax_rate}%):`, 140, currentY);
  doc.text(`₹${bill.tax_amount.toLocaleString()}`, 170, currentY);
  currentY += 8;
  
  if (bill.discount_amount > 0) {
    doc.text('Discount:', 140, currentY);
    doc.text(`-₹${bill.discount_amount.toLocaleString()}`, 170, currentY);
    currentY += 8;
  }
  
  // Total line
  doc.line(140, currentY, 190, currentY);
  currentY += 8;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Total:', 140, currentY);
  doc.text(`₹${bill.total_amount.toLocaleString()}`, 170, currentY);
  
  // Notes
  if (bill.notes) {
    currentY += 20;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Notes:', 20, currentY);
    currentY += 8;
    
    const noteLines = bill.notes.split('\n');
    noteLines.forEach((line) => {
      doc.text(line, 20, currentY);
      currentY += 7;
    });
  }
  
  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text('Thank you for your business!', 20, 280);
  
  // Save the PDF
  doc.save(`bill-${bill.bill_number}.pdf`);
};