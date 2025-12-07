
'use client';

import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Download, Printer } from "lucide-react";
import type { Invoice, InvoiceItem } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";

interface InvoiceDetailViewProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  items: InvoiceItem[];
}

export function InvoiceDetailView({ isOpen, onClose, invoice, items }: InvoiceDetailViewProps) {
  const { toast } = useToast();
  const isMobile = useIsMobile();

  if (!invoice) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount);
  };
  
  const formatCurrencyForPdf = (amount: number) => {
    return `Rs. ${amount.toFixed(2)}`;
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(20);
    doc.text("Tax Invoice", 105, 20, { align: "center" });

    doc.setFontSize(10);
    const topY = 35;
    
    let fromX = 14;
    doc.setFont('helvetica', 'bold');
    doc.text("From:", fromX, topY);
    doc.setFont('helvetica', 'normal');
    let fromY = topY + 6;
    if (invoice.businessName) { doc.text(invoice.businessName, fromX, fromY); fromY += 5; }
    if (invoice.ownerName) { doc.text(invoice.ownerName, fromX, fromY); fromY += 5; }
    if (invoice.address) {
        const addressLines = doc.splitTextToSize(invoice.address, 80);
        doc.text(addressLines, fromX, fromY);
        fromY += (addressLines.length * 5);
    }
    if (invoice.gstin) { doc.text(`GSTIN: ${invoice.gstin}`, fromX, fromY); }

    let toX = 110;
    doc.setFont('helvetica', 'bold');
    doc.text("Bill To:", toX, topY);
    doc.setFont('helvetica', 'normal');
    let toY = topY + 6;
    if (invoice.customerName) { doc.text(invoice.customerName, toX, toY); toY += 5; }
    if (invoice.customerGstin) { doc.text(`GSTIN: ${invoice.customerGstin}`, toX, toY); toY += 5; }
    doc.text(`Date: ${format(new Date(invoice.billDate.seconds * 1000), "PPP")}`, toX, toY);

    const startY = Math.max(fromY, toY) + 10;
    
    const tableColumn = ["#", "Product / HSN", "Qty", "Price", "Taxable", "GST", "Total"];
    const tableRows: (string | number)[][] = [];
    
    items.forEach((item, index) => {
      const itemData = [
        index + 1,
        `${item.productName}${item.hsnCode ? `\nHSN: ${item.hsnCode}`: ''}${item.details ? `\n(${item.details})` : ''}`,
        item.quantity,
        formatCurrencyForPdf(item.unitPrice),
        formatCurrencyForPdf(item.taxableValue),
        `${item.gstRate}%`,
        formatCurrencyForPdf(item.total),
      ];
      tableRows.push(itemData);
    });

    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: startY,
      theme: 'grid',
      headStyles: { fillColor: [34, 107, 63] },
      styles: { cellPadding: 2, fontSize: 10, valign: 'middle' },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 60 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
      },
      didDrawPage: (data: any) => {
        doc.saveGraphicsState();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(240, 240, 240);
        const pageSize = doc.internal.pageSize;
        const pageWidth = pageSize.getWidth();
        const pageHeight = pageSize.getHeight();
        const watermarkText = "Kanstruction";
        const angle = -45;

        const textWidth = doc.getStringUnitWidth(watermarkText) * doc.getFontSize() / doc.internal.scaleFactor;
        const textHeight = doc.getFontSize() / doc.internal.scaleFactor;

        const hPadding = 120;
        const vPadding = 80;

        for (let y = -textHeight; y < pageHeight + textHeight; y += vPadding) {
            for (let x = -textWidth; x < pageWidth + textWidth; x += hPadding) {
                doc.text(watermarkText, x, y, { angle: angle, align: 'center' });
            }
        }
        doc.restoreGraphicsState();
      }
    });
    
    let finalY = (doc as any).lastAutoTable.finalY;

    doc.setFontSize(12);
    finalY += 10;
    doc.text("Subtotal:", 150, finalY, { align: 'right' });
    doc.text(formatCurrencyForPdf(invoice.subtotal), 200, finalY, { align: 'right' });

    finalY += 7;
    doc.text("CGST:", 150, finalY, { align: 'right' });
    doc.text(formatCurrencyForPdf(invoice.totalGst / 2), 200, finalY, { align: 'right' });

    finalY += 7;
    doc.text("SGST:", 150, finalY, { align: 'right' });
    doc.text(formatCurrencyForPdf(invoice.totalGst / 2), 200, finalY, { align: 'right' });
    
    finalY += 7;
    doc.text("Total GST:", 150, finalY, { align: 'right' });
    doc.text(formatCurrencyForPdf(invoice.totalGst), 200, finalY, { align: 'right' });
    
    finalY += 7;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Grand Total:", 150, finalY, { align: 'right' });
    doc.text(formatCurrencyForPdf(invoice.grandTotal), 200, finalY, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("Thank you for your business! - Generated by Kanstruction", 105, finalY + 15, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text("Disclaimer: This is not a legally valid tax invoice. This bill is generated only for personal or reference purposes.", 105, finalY + 22, { align: 'center', maxWidth: 180 });
    
    doc.save(`invoice-${invoice.id.substring(0, 6)}.pdf`);
    
    toast({
      title: "Download Started",
      description: "Your invoice PDF is being downloaded.",
    });
  };

  const generateThermalPdf = () => {
    if (!invoice) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297] 
    });

    const margin = 5;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 10;
    const lineHeight = 5;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    if (invoice.businessName) {
      doc.text(invoice.businessName, pageWidth / 2, y, { align: 'center' });
      y += lineHeight;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (invoice.address) {
      const addressLines = doc.splitTextToSize(invoice.address, pageWidth - margin * 2);
      doc.text(addressLines, pageWidth / 2, y, { align: 'center' });
      y += addressLines.length * (lineHeight - 2);
    }
    if (invoice.gstin) {
      doc.text(`GSTIN: ${invoice.gstin}`, pageWidth / 2, y, { align: 'center' });
      y += lineHeight;
    }
    y += 2;
    doc.text("-".repeat(50), pageWidth / 2, y, { align: 'center' });
    y += lineHeight;

    const billDate = invoice.billDate ? new Date(invoice.billDate.seconds * 1000) : new Date();
    doc.text(`Date: ${format(billDate, "dd/MM/yyyy HH:mm")}`, margin, y);
    y += lineHeight;

    if (invoice.customerName) {
      doc.text(`To: ${invoice.customerName}`, margin, y);
      y += lineHeight;
    }
    if (invoice.customerGstin) {
      doc.text(`GSTIN: ${invoice.customerGstin}`, margin, y);
      y += lineHeight;
    }

    doc.text("-".repeat(50), pageWidth / 2, y, { align: 'center' });
    y += lineHeight;

    doc.setFont('helvetica', 'bold');
    doc.text("Description", margin, y);
    doc.text("Amt", pageWidth - margin, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += lineHeight;


    items.forEach((item) => {
        const itemText = `${item.productName}${item.details ? ` (${item.details})` : ''}`;
        const lines = doc.splitTextToSize(itemText, pageWidth - margin * 2 - 20);
        doc.text(lines, margin, y);

        const priceText = formatCurrency(item.total);
        doc.text(priceText, pageWidth - margin, y, { align: 'right' });
        
        y += lines.length * (lineHeight - 1);

        const qtyText = `  ${item.quantity} x ${formatCurrency(item.unitPrice)} @${item.gstRate}%`;
        doc.text(qtyText, margin, y);
        y += lineHeight;
    });

    doc.text("-".repeat(50), pageWidth / 2, y, { align: 'center' });
    y += lineHeight;

    doc.text("Subtotal:", margin, y);
    doc.text(formatCurrency(invoice.subtotal), pageWidth - margin, y, { align: 'right' });
    y += lineHeight;

    doc.text("CGST:", margin, y);
    doc.text(formatCurrency(invoice.totalGst / 2), pageWidth - margin, y, { align: 'right' });
    y += lineHeight;
    
    doc.text("SGST:", margin, y);
    doc.text(formatCurrency(invoice.totalGst / 2), pageWidth - margin, y, { align: 'right' });
    y += lineHeight;

    doc.text("-".repeat(50), pageWidth / 2, y, { align: 'center' });
    y += lineHeight;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("Total:", margin, y);
    doc.text(formatCurrency(invoice.grandTotal), pageWidth - margin, y, { align: 'right' });
    y += (lineHeight * 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text("Thank you for your business!", pageWidth / 2, y, { align: 'center' });
    y += lineHeight;

    doc.save(`thermal-receipt-${invoice.id.substring(0, 6)}.pdf`);
    toast({
      title: "Download Started",
      description: "Your thermal receipt is being downloaded.",
    });
  }

  const content = (
    <>
        <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
            <h3 className="font-semibold mb-2 text-muted-foreground">From:</h3>
            <p className="font-bold">{invoice.businessName}</p>
            <p>{invoice.ownerName}</p>
            <p className="whitespace-pre-wrap">{invoice.address}</p>
            {invoice.gstin && <p>GSTIN: {invoice.gstin}</p>}
            </div>
            <div className="text-right">
            <h3 className="font-semibold mb-2 text-muted-foreground">Bill To:</h3>
            <p className="font-bold">{invoice.customerName}</p>
            {invoice.customerGstin && <p>GSTIN: {invoice.customerGstin}</p>}
            <p>Date: {format(new Date(invoice.billDate.seconds * 1000), 'PPP')}</p>
            </div>
        </div>
      
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="hidden sm:table-cell">#</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {items.map((item, index) => (
                    <TableRow key={item.id}>
                    <TableCell className="hidden sm:table-cell">{index + 1}</TableCell>
                    <TableCell>
                        {item.productName}
                        {item.hsnCode && <span className="text-xs text-muted-foreground block">HSN: {item.hsnCode}</span>}
                        {item.details && <span className="text-xs text-muted-foreground block">({item.details})</span>}
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>

        <Separator className="my-4" />

        <div className="w-full sm:w-1/2 ml-auto space-y-2 text-sm">
            <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
             <div className="flex justify-between">
                <span className="text-muted-foreground">CGST</span>
                <span>{formatCurrency(invoice.totalGst / 2)}</span>
            </div>
            <div className="flex justify-between">
                <span className="text-muted-foreground">SGST</span>
                <span>{formatCurrency(invoice.totalGst / 2)}</span>
            </div>
            <div className="flex justify-between">
            <span className="text-muted-foreground">Total GST</span>
            <span>{formatCurrency(invoice.totalGst)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
            <span>Grand Total</span>
            <span>{formatCurrency(invoice.grandTotal)}</span>
            </div>
        </div>
    </>
  );

  if (isMobile) {
    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent side="bottom" className="h-full w-full p-0 flex flex-col">
                <SheetHeader className="p-4 border-b">
                    <SheetTitle>Invoice Details</SheetTitle>
                </SheetHeader>
                <ScrollArea className="flex-1 px-4">
                    <div className="py-4 space-y-6">
                        {content}
                    </div>
                </ScrollArea>
                <SheetFooter className="p-4 border-t bg-background flex-col sm:flex-row gap-2">
                    <Button variant="outline" onClick={onClose} className="w-full">Close</Button>
                    <Button variant="outline" onClick={generateThermalPdf} className="w-full">
                        <Printer className="mr-2 h-4 w-4" /> Thermal Print
                    </Button>
                    <Button onClick={handleDownloadPdf} className="w-full">
                        <Download className="mr-2 h-4 w-4" /> Download PDF
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Invoice Details</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[80vh] -mx-6">
          <div className="px-6 py-2 space-y-6">
            {content}
          </div>
        </ScrollArea>
         <DialogFooter className="pt-4 justify-between sm:justify-end">
            <DialogClose asChild>
                <Button variant="outline">Close</Button>
            </DialogClose>
            <div className="flex gap-2">
                <Button variant="outline" onClick={generateThermalPdf}>
                    <Printer className="mr-2 h-4 w-4" /> Thermal Print
                </Button>
                <Button onClick={handleDownloadPdf}>
                    <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
            </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

    
