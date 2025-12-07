
"use client";

import { useState, useMemo, useEffect, useId } from "react";
import { useRouter } from 'next/navigation';
import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import {
  Plus,
  Trash2,
  Download,
  RotateCw,
  Calendar as CalendarIcon,
  Edit,
  User as UserIcon,
  LogOut,
  Save,
  FileText,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { KanstructionLogo } from "@/components/icons";
import { PRODUCT_CATEGORIES, PRODUCTS, GST_RATES } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useAuth, useUser, useFirestore, addDocumentNonBlocking, setDocumentNonBlocking } from '@/firebase';
import { collection, serverTimestamp, Timestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import type { BillItem, BusinessDetails, CustomerDetails, ProductCategory } from '@/lib/types';
import { Checkbox } from "@/components/ui/checkbox";


const initialBusinessDetails: BusinessDetails = {
  businessName: "",
  ownerName: "",
  gstin: "",
  address: "",
};

const initialCustomerDetails: CustomerDetails = {
    customerName: "",
    customerGstin: "",
    billDate: new Date(),
};

const initialCurrentItem = {
    category: "" as ProductCategory | "",
    productName: "",
    hsnCode: "",
    quantity: "1",
    unitPrice: "",
    gstRate: 18,
    isGstInclusive: false,
    customProductName: "",
    details: "",
};

export default function BillingPage() {
  const { toast } = useToast();
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  
  const [businessDetails, setBusinessDetails] = useState<BusinessDetails>(initialBusinessDetails);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails>(initialCustomerDetails);
  const [currentItem, setCurrentItem] = useState(initialCurrentItem);
  const [items, setItems] = useState<BillItem[]>([]);
  
  const [editingItem, setEditingItem] = useState<BillItem | null>(null);
  
  const [subtotal, setSubtotal] = useState(0);
  const [totalGst, setTotalGst] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);
  
  useEffect(() => {
    const newSubtotal = items.reduce((acc, item) => acc + item.taxableValue, 0);
    const newTotalGst = items.reduce((acc, item) => acc + item.gstAmount, 0);
    setSubtotal(newSubtotal);
    setTotalGst(newTotalGst);
    setGrandTotal(newSubtotal + newTotalGst);
  }, [items]);
  
  const id = useId();

  const handleAddItem = () => {
    const { category, productName, gstRate, customProductName, details, hsnCode, isGstInclusive } = currentItem;
    
    const quantity = parseFloat(String(currentItem.quantity));
    const priceInput = parseFloat(String(currentItem.unitPrice));

    let finalProductName = productName;
    if (category === "Others") {
        finalProductName = customProductName;
    }

    if (!finalProductName || !(quantity > 0) || !(priceInput > 0)) {
      toast({
        variant: "destructive",
        title: "Invalid Item",
        description: "Please fill all item details correctly.",
      });
      return;
    }

    let unitPrice: number, taxableValue: number, gstAmount: number, total: number;

    if (isGstInclusive) {
        const totalPerUnit = priceInput;
        const taxablePerUnit = totalPerUnit / (1 + gstRate / 100);
        unitPrice = taxablePerUnit; // Store the calculated taxable value as the unit price
        taxableValue = taxablePerUnit * quantity;
        total = totalPerUnit * quantity;
        gstAmount = total - taxableValue;
    } else {
        unitPrice = priceInput;
        taxableValue = unitPrice * quantity;
        gstAmount = (taxableValue * gstRate) / 100;
        total = taxableValue + gstAmount;
    }

    const newItem: BillItem = {
      id: `${id}-${Date.now()}`,
      category: category || "",
      productName: finalProductName,
      hsnCode,
      details,
      quantity,
      unitPrice,
      gstRate,
      isGstInclusive,
      taxableValue,
      gstAmount,
      total,
    };

    setItems((prevItems) => [...prevItems, newItem]);
    setCurrentItem(initialCurrentItem);
  };
  
  const handleDeleteItem = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };
  
  const handleStartEditing = (item: BillItem) => {
    setEditingItem({ ...item, quantity: String(item.quantity), unitPrice: String(item.isGstInclusive ? (item.unitPrice * (1 + item.gstRate / 100)) : item.unitPrice) });
  };
  
  const handleUpdateItem = () => {
    if (!editingItem) return;
    
    const quantity = parseFloat(String(editingItem.quantity));
    const priceInput = parseFloat(String(editingItem.unitPrice));
    const { gstRate, isGstInclusive } = editingItem;


    if (!(quantity > 0) || !(priceInput >= 0)) {
      toast({
        variant: "destructive",
        title: "Invalid Values",
        description: "Quantity must be positive and Unit Price cannot be negative.",
      });
      return;
    }

    let unitPrice: number, taxableValue: number, gstAmount: number, total: number;

    if (isGstInclusive) {
        const totalPerUnit = priceInput;
        const taxablePerUnit = totalPerUnit / (1 + gstRate / 100);
        unitPrice = taxablePerUnit;
        taxableValue = taxablePerUnit * quantity;
        total = totalPerUnit * quantity;
        gstAmount = total - taxableValue;
    } else {
        unitPrice = priceInput;
        taxableValue = unitPrice * quantity;
        gstAmount = (taxableValue * gstRate) / 100;
        total = taxableValue + gstAmount;
    }
    
    const updatedItem: BillItem = {
      ...editingItem,
      quantity,
      unitPrice,
      taxableValue,
      gstAmount,
      total,
    };

    setItems(items.map(item => item.id === updatedItem.id ? updatedItem : item));
    setEditingItem(null);
     toast({
      title: "Item Updated",
      description: `${updatedItem.productName} has been updated.`,
    });
  };


  const handleResetBill = () => {
    setItems([]);
    setBusinessDetails(initialBusinessDetails);
    setCustomerDetails(initialCustomerDetails);
    setCurrentItem(initialCurrentItem);
    toast({
      title: "Bill Reset",
      description: "A new bill has been started.",
    });
  };
  
  const handleProductChange = (productName: string) => {
    const product = productOptions.find(p => p.name === productName);
    setCurrentItem({
      ...currentItem,
      productName: productName,
      hsnCode: product?.hsnCode || ""
    });
  };

  const formatCurrencyForPdf = (amount: number) => {
    return `Rs. ${amount.toFixed(2)}`;
  };
  
  const generateAndDownloadPdf = () => {
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
    if (businessDetails.businessName) { doc.text(businessDetails.businessName, fromX, fromY); fromY += 5; }
    if (businessDetails.ownerName) { doc.text(businessDetails.ownerName, fromX, fromY); fromY += 5; }
    if (businessDetails.address) {
        const addressLines = doc.splitTextToSize(businessDetails.address, 80);
        doc.text(addressLines, fromX, fromY);
        fromY += (addressLines.length * 5);
    }
    if (businessDetails.gstin) { doc.text(`GSTIN: ${businessDetails.gstin}`, fromX, fromY); }

    let toX = 110;
    doc.setFont('helvetica', 'bold');
    doc.text("Bill To:", toX, topY);
    doc.setFont('helvetica', 'normal');
    let toY = topY + 6;
    if (customerDetails.customerName) { doc.text(customerDetails.customerName, toX, toY); toY += 5; }
    if (customerDetails.customerGstin) { doc.text(`GSTIN: ${customerDetails.customerGstin}`, toX, toY); toY += 5; }
    doc.text(`Date: ${format(customerDetails.billDate, "PPP")}`, toX, toY);

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
    doc.text(formatCurrencyForPdf(subtotal), 200, finalY, { align: 'right' });

    finalY += 7;
    doc.text("CGST:", 150, finalY, { align: 'right' });
    doc.text(formatCurrencyForPdf(totalGst / 2), 200, finalY, { align: 'right' });

    finalY += 7;
    doc.text("SGST:", 150, finalY, { align: 'right' });
    doc.text(formatCurrencyForPdf(totalGst / 2), 200, finalY, { align: 'right' });

    finalY += 7;
    doc.text("Total GST:", 150, finalY, { align: 'right' });
    doc.text(formatCurrencyForPdf(totalGst), 200, finalY, { align: 'right' });
    
    finalY += 7;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text("Grand Total:", 150, finalY, { align: 'right' });
    doc.text(formatCurrencyForPdf(grandTotal), 200, finalY, { align: 'right' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text("Thank you for your business! - Generated by Kanstruction", 105, finalY + 15, { align: 'center' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.text("Disclaimer: This is not a legally valid tax invoice. This bill is generated only for personal or reference purposes.", 105, finalY + 22, { align: 'center', maxWidth: 180 });
    
    doc.save("invoice.pdf");

    toast({
      title: "Download Started",
      description: "Your invoice PDF is being downloaded.",
    });
  }

  const generateThermalPdf = () => {
    // 80mm is a common thermal paper width.
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297] // 80mm width, standard A4 height (can be adjusted)
    });

    const margin = 5;
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 10;
    const lineHeight = 5;

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    if (businessDetails.businessName) {
      doc.text(businessDetails.businessName, pageWidth / 2, y, { align: 'center' });
      y += lineHeight;
    }

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    if (businessDetails.address) {
      const addressLines = doc.splitTextToSize(businessDetails.address, pageWidth - margin * 2);
      doc.text(addressLines, pageWidth / 2, y, { align: 'center' });
      y += addressLines.length * (lineHeight - 2);
    }
    if (businessDetails.gstin) {
      doc.text(`GSTIN: ${businessDetails.gstin}`, pageWidth / 2, y, { align: 'center' });
      y += lineHeight;
    }
    y += 2;
    doc.text("-".repeat(50), pageWidth / 2, y, { align: 'center' });
    y += lineHeight;

    doc.text(`Date: ${format(customerDetails.billDate, "dd/MM/yyyy HH:mm")}`, margin, y);
    y += lineHeight;

    if (customerDetails.customerName) {
      doc.text(`To: ${customerDetails.customerName}`, margin, y);
      y += lineHeight;
    }
    if (customerDetails.customerGstin) {
      doc.text(`GSTIN: ${customerDetails.customerGstin}`, margin, y);
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
        const lines = doc.splitTextToSize(itemText, pageWidth - margin * 2 - 20); // leave space for amount
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
    doc.text(formatCurrency(subtotal), pageWidth - margin, y, { align: 'right' });
    y += lineHeight;

    doc.text("CGST:", margin, y);
    doc.text(formatCurrency(totalGst / 2), pageWidth - margin, y, { align: 'right' });
    y += lineHeight;
    
    doc.text("SGST:", margin, y);
    doc.text(formatCurrency(totalGst / 2), pageWidth - margin, y, { align: 'right' });
    y += lineHeight;

    doc.text("-".repeat(50), pageWidth / 2, y, { align: 'center' });
    y += lineHeight;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text("Total:", margin, y);
    doc.text(formatCurrency(grandTotal), pageWidth - margin, y, { align: 'right' });
    y += (lineHeight * 2);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text("Thank you for your business!", pageWidth / 2, y, { align: 'center' });
    y += lineHeight;

    doc.save("thermal-receipt.pdf");
    toast({
      title: "Download Started",
      description: "Your thermal receipt is being downloaded.",
    });
  }

  const handleSaveAndDownloadPdf = async () => {
    if (items.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty Bill",
        description: "Please add at least one item.",
      });
      return;
    }
    
    if (user && !user.isAnonymous) {
      try {
        const invoiceData = {
          ...businessDetails,
          ...customerDetails,
          billDate: Timestamp.fromDate(customerDetails.billDate), // Convert Date to Firestore Timestamp
          subtotal,
          totalGst,
          grandTotal,
          createdAt: serverTimestamp(),
          userId: user.uid
        };
        
        const invoicesRef = collection(firestore, 'users', user.uid, 'invoices');
        const docRef = await addDocumentNonBlocking(invoicesRef, invoiceData);

        const itemsRef = collection(docRef, 'invoice_items');
        for (const item of items) {
          const {id, ...itemData} = item; // remove client-side id
          await addDocumentNonBlocking(itemsRef, itemData);
        }
        
        toast({
          title: "Invoice Saved",
          description: "Your invoice has been saved to your account.",
        });

      } catch (error) {
        console.error("Error saving invoice: ", error);
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: "Could not save the invoice. Please try again.",
        });
        return; // Don't proceed to download if save fails
      }
    }
  
    generateAndDownloadPdf();
  };

  const productOptions = useMemo(() => {
    if (!currentItem.category) return [];
    const products = PRODUCTS[currentItem.category];
    return Array.isArray(products) ? products : [];
  }, [currentItem.category]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(amount);
  };
  
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }


  return (
    <>
      <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
        <header className="container mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4 border-b bg-white">
          <div className="flex items-center gap-4">
            <KanstructionLogo className="h-8 w-8 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold text-foreground">
              Kanstruction Billing
            </h1>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                  <AvatarFallback>
                    {user?.isAnonymous ? 'G' : user?.email?.charAt(0).toUpperCase() || <UserIcon />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {user?.isAnonymous ? 'Guest User' : user?.displayName || user?.email}
                  </p>
                  {!user?.isAnonymous && <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>}
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
               {!user?.isAnonymous && (
                <DropdownMenuItem onClick={() => router.push('/invoices')}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>My Invoices</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-grow container mx-auto p-4 md:p-8 pt-6">
          {user.isAnonymous && (
              <Card className="mb-6 bg-yellow-50 border-yellow-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-yellow-800">
                      You are currently using a guest session. Your bills will not be saved. <a href="/login" className="font-bold underline">Log in or sign up</a> to save your progress.
                    </p>
                  </div>
                </CardContent>
              </Card>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="grid md:grid-cols-1 gap-6">
                <Card className="shadow-sm border-border bg-white">
                  <CardHeader>
                    <CardTitle className="text-xl">From</CardTitle>
                    <CardDescription>Your business details for the invoice.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input id="businessName" placeholder="e.g., Your Company LLC" value={businessDetails.businessName} onChange={e => setBusinessDetails({...businessDetails, businessName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ownerName">Owner Name</Label>
                      <Input id="ownerName" placeholder="e.g., John Doe" value={businessDetails.ownerName} onChange={e => setBusinessDetails({...businessDetails, ownerName: e.target.value})} />
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="businessAddress">Business Address</Label>
                      <Textarea id="businessAddress" placeholder="e.g., 123 Main St, Anytown..." value={businessDetails.address} onChange={e => setBusinessDetails({...businessDetails, address: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="gstin">Your GSTIN</Label>
                      <Input id="gstin" placeholder="e.g., 29ABCDE1234F1Z5" value={businessDetails.gstin} onChange={e => setBusinessDetails({...businessDetails, gstin: e.target.value.toUpperCase()})} />
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-border bg-white">
                  <CardHeader>
                    <CardTitle className="text-xl">Bill To</CardTitle>
                    <CardDescription>Your customer's details.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="customerName">Customer Name</Label>
                      <Input id="customerName" placeholder="e.g., Acme Inc." value={customerDetails.customerName} onChange={e => setCustomerDetails({...customerDetails, customerName: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerGstin">Customer's GSTIN</Label>
                      <Input id="customerGstin" placeholder="e.g., 27ABCDE1234F1Z5" value={customerDetails.customerGstin} onChange={e => setCustomerDetails({...customerDetails, customerGstin: e.target.value.toUpperCase()})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billDate">Bill Date</Label>
                       <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !customerDetails.billDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {customerDetails.billDate ? format(customerDetails.billDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={customerDetails.billDate}
                            onSelect={(date) => setCustomerDetails({...customerDetails, billDate: date || new Date()})}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-sm border-border bg-white">
                <CardHeader>
                  <CardTitle className="text-xl">Add Item</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                   <div className="space-y-2">
                      <Label htmlFor="category">Category (Optional)</Label>
                      <Select value={currentItem.category} onValueChange={(value: ProductCategory | "") => setCurrentItem({...currentItem, category: value, productName: '', hsnCode: ''})}>
                          <SelectTrigger id="category"><SelectValue placeholder="Select a category" /></SelectTrigger>
                          <SelectContent>
                              {PRODUCT_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                  {currentItem.category && currentItem.category !== "Others" ? (
                     <div className="space-y-2">
                        <Label htmlFor="productName">Product</Label>
                        <Select value={currentItem.productName} onValueChange={handleProductChange}>
                            <SelectTrigger id="productName"><SelectValue placeholder="Select a product" /></SelectTrigger>
                            <SelectContent>
                                {productOptions.map(prod => <SelectItem key={prod.name} value={prod.name}>{prod.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                  ) : currentItem.category === 'Others' ? (
                    <div className="space-y-2">
                        <Label htmlFor="customProductName">Product Name</Label>
                        <Input id="customProductName" placeholder="Enter custom product name" value={currentItem.customProductName} onChange={e => setCurrentItem({...currentItem, customProductName: e.target.value})} />
                    </div>
                  ) : (
                    <div className="space-y-2">
                        <Label htmlFor="productName">Product Name</Label>
                        <Input id="productName" placeholder="Enter product name" value={currentItem.productName} onChange={e => setCurrentItem({...currentItem, productName: e.target.value})} />
                    </div>
                  )}
                  <div className="space-y-2">
                      <Label htmlFor="hsnCode">HSN Code (Optional)</Label>
                      <Input id="hsnCode" placeholder="e.g., 252329" value={currentItem.hsnCode} onChange={e => setCurrentItem({...currentItem, hsnCode: e.target.value})} />
                  </div>
                   <div className="space-y-2">
                        <Label htmlFor="details">Additional Details (Optional)</Label>
                        <Input id="details" placeholder="e.g., PPC, 10mm, Grade A" value={currentItem.details} onChange={e => setCurrentItem({...currentItem, details: e.target.value})} />
                    </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity">Quantity</Label>
                      <Input id="quantity" type="text" placeholder="1" value={currentItem.quantity} onChange={e => setCurrentItem({...currentItem, quantity: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unitPrice">Unit Price (₹)</Label>
                      <Input id="unitPrice" type="text" placeholder="0.00" value={currentItem.unitPrice} onChange={e => setCurrentItem({...currentItem, unitPrice: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="gstRate">GST Rate</Label>
                      <Select value={String(currentItem.gstRate)} onValueChange={value => setCurrentItem({...currentItem, gstRate: parseInt(value)})}>
                          <SelectTrigger id="gstRate"><SelectValue placeholder="Select GST %" /></SelectTrigger>
                          <SelectContent>
                              {GST_RATES.map(rate => <SelectItem key={rate} value={String(rate)}>{rate}%</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                        id="gstInclusive"
                        checked={currentItem.isGstInclusive}
                        onCheckedChange={(checked) => setCurrentItem({...currentItem, isGstInclusive: Boolean(checked)})}
                    />
                    <Label htmlFor="gstInclusive" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                        Price is GST Inclusive
                    </Label>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleAddItem} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Add Item
                  </Button>
                </CardFooter>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <Card className="shadow-sm border-border h-full flex flex-col bg-white">
                <CardHeader>
                  <CardTitle className="text-xl">Current Bill</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow">
                   <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px] text-muted-foreground hidden sm:table-cell">#</TableHead>
                            <TableHead className="text-muted-foreground">Product</TableHead>
                            <TableHead className="text-right text-muted-foreground hidden sm:table-cell">Qty</TableHead>
                            <TableHead className="text-right text-muted-foreground">Price</TableHead>
                            <TableHead className="text-right text-muted-foreground hidden md:table-cell">Taxable Value</TableHead>
                            <TableHead className="text-right text-muted-foreground hidden md:table-cell">GST</TableHead>
                            <TableHead className="text-right text-muted-foreground">Total</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="text-center text-muted-foreground h-48">
                                    Your bill is empty. Add items to get started.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item, index) => (
                            <TableRow key={item.id} className="hover:bg-gray-50">
                                <TableCell className="text-muted-foreground hidden sm:table-cell">{index + 1}</TableCell>
                                <TableCell className="font-medium">
                                  {item.productName}
                                  {item.hsnCode && <span className="text-muted-foreground text-xs block">HSN: {item.hsnCode}</span>}
                                  {item.details && <span className="text-muted-foreground text-xs block">({item.details})</span>}
                                </TableCell>
                                <TableCell className="text-right hidden sm:table-cell">{item.quantity}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                                <TableCell className="text-right hidden md:table-cell">{formatCurrency(item.taxableValue)}</TableCell>
                                <TableCell className="text-right hidden md:table-cell">{item.gstRate}%</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(item.total)}</TableCell>
                                <TableCell className="flex">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleStartEditing(item)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteItem(item.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                </TableCell>
                            </TableRow>
                            ))
                        )}
                        </TableBody>
                    </Table>
                   </div>
                </CardContent>
                {items.length > 0 && (
                   <>
                    <div className="p-4 md:p-6 pt-0">
                      <Separator className="my-4"/>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">{formatCurrency(subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CGST</span>
                          <span className="font-medium">{formatCurrency(totalGst / 2)}</span>
                        </div>
                         <div className="flex justify-between">
                          <span className="text-muted-foreground">SGST</span>
                          <span className="font-medium">{formatCurrency(totalGst / 2)}</span>
                        </div>
                         <div className="flex justify-between">
                          <span className="text-muted-foreground">Total GST</span>
                          <span className="font-medium">{formatCurrency(totalGst)}</span>
                        </div>
                        <Separator className="my-2" />
                        <div className="flex justify-between items-center">
                          <span className="text-base md:text-lg font-bold text-foreground">Grand Total</span>
                          <span className="text-lg md:text-xl font-bold text-primary">{formatCurrency(grandTotal)}</span>
                        </div>
                      </div>
                    </div>
                    <CardFooter className="flex-wrap justify-end gap-2 border-t pt-6">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="outline"><RotateCw className="mr-2 h-4 w-4"/>Reset Bill</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will clear all items and business details from the current bill. This action cannot be undone.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleResetBill}>Continue</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                        
                        <Button variant="outline" onClick={generateThermalPdf}>
                            <Printer className="mr-2 h-4 w-4" /> Thermal Print
                        </Button>

                      <Button onClick={handleSaveAndDownloadPdf}>
                        {user && !user.isAnonymous ? <Save className="mr-2 h-4 w-4" /> : <Download className="mr-2 h-4 w-4" />}
                        {user && !user.isAnonymous ? 'Save & Download' : 'Download PDF'}
                      </Button>
                    </CardFooter>
                   </>
                )}
              </Card>
            </div>
          </div>
        </main>
      </div>

       {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={(isOpen) => !isOpen && setEditingItem(null)}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Item</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="edit-productName">Product Name</Label>
                        <Input id="edit-productName" value={editingItem.productName} onChange={e => setEditingItem({...editingItem, productName: e.target.value})} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="edit-hsnCode">HSN Code</Label>
                        <Input id="edit-hsnCode" value={editingItem.hsnCode || ''} onChange={e => setEditingItem({...editingItem, hsnCode: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-details">Additional Details</Label>
                        <Input id="edit-details" value={editingItem.details || ''} onChange={e => setEditingItem({...editingItem, details: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-quantity">Quantity</Label>
                        <Input id="edit-quantity" type="text" value={editingItem.quantity} onChange={e => setEditingItem({...editingItem, quantity: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="edit-unitPrice">Unit Price (₹)</Label>
                        <Input id="edit-unitPrice" type="text" value={editingItem.unitPrice} onChange={e => setEditingItem({...editingItem, unitPrice: e.target.value})} />
                      </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="edit-gstRate">GST Rate</Label>
                        <Select value={String(editingItem.gstRate)} onValueChange={value => setEditingItem({...editingItem, gstRate: parseInt(value)})}>
                            <SelectTrigger id="edit-gstRate"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                {GST_RATES.map(rate => <SelectItem key={rate} value={String(rate)}>{rate}%</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="edit-gstInclusive"
                            checked={editingItem.isGstInclusive}
                            onCheckedChange={(checked) => setEditingItem({...editingItem, isGstInclusive: Boolean(checked)})}
                        />
                        <Label htmlFor="edit-gstInclusive" className="text-sm font-medium leading-none">
                            Price is GST Inclusive
                        </Label>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button onClick={handleUpdateItem}>Save Changes</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
      )}
    </>
  );
}
