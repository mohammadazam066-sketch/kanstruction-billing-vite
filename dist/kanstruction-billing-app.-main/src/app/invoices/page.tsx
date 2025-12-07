
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { KanstructionLogo } from '@/components/icons';
import { LogOut, User as UserIcon, FileText, ArrowLeft } from 'lucide-react';
import { InvoiceDetailView } from '@/components/invoice-detail-view';
import type { Invoice, InvoiceItem } from '@/lib/types';


export default function InvoicesPage() {
  const router = useRouter();
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading } = useUser();

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);

  // Memoize the query to prevent re-renders
  const invoicesQuery = useMemoFirebase(() => {
    if (!user || user.isAnonymous) return null;
    return query(collection(firestore, `users/${user.uid}/invoices`), orderBy('billDate', 'desc'));
  }, [firestore, user]);

  const { data: invoices, isLoading: isInvoicesLoading } = useCollection<Invoice>(invoicesQuery);

  useEffect(() => {
    if (!isUserLoading && (!user || user.isAnonymous)) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);
  
  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleViewDetails = async (invoice: Invoice) => {
    if (!user) return;
    setSelectedInvoice(invoice);

    const itemsRef = collection(firestore, `users/${user.uid}/invoices/${invoice.id}/invoice_items`);
    const itemsSnapshot = await getDocs(itemsRef);
    const items = itemsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })) as InvoiceItem[];
    setInvoiceItems(items);

    setIsDetailViewOpen(true);
  };
  
  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
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
              My Invoices
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
             <Button variant="outline" size="sm" onClick={() => router.push('/')}>
                <ArrowLeft className="mr-0 md:mr-2 h-4 w-4" />
                <span className="hidden md:inline">Back to Billing</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                    <AvatarFallback>
                      {user?.email?.charAt(0).toUpperCase() || <UserIcon />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.displayName || user?.email}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/')}>
                  <FileText className="mr-2 h-4 w-4" />
                  <span>New Bill</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-grow container mx-auto p-4 md:p-8 pt-6">
          <Card className="shadow-sm border-border bg-white">
            <CardHeader>
              <CardTitle>Saved Invoices</CardTitle>
              <CardDescription>Here are all the invoices you've saved to your account.</CardDescription>
            </CardHeader>
            <CardContent>
              {isInvoicesLoading && <p className="text-muted-foreground">Loading invoices...</p>}
              {!isInvoicesLoading && (!invoices || invoices.length === 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="mx-auto h-12 w-12" />
                  <p className="mt-4 text-lg">No Invoices Found</p>
                  <p className="text-sm">You haven't saved any invoices yet.</p>
                   <Button className="mt-4" onClick={() => router.push('/')}>Create First Invoice</Button>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {invoices?.map(invoice => (
                  <Card key={invoice.id} className="flex flex-col">
                    <CardHeader>
                      <CardTitle className="text-lg">{invoice.customerName || 'N/A'}</CardTitle>
                       <CardDescription>
                         { format(new Date(invoice.billDate.seconds * 1000), 'PPP') }
                       </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <p className="text-2xl font-bold text-primary">
                          {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(invoice.grandTotal)}
                        </p>
                    </CardContent>
                    <div className="border-t p-4">
                        <Button className="w-full" onClick={() => handleViewDetails(invoice)}>
                          View Details
                        </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>

       {selectedInvoice && (
        <InvoiceDetailView
          isOpen={isDetailViewOpen}
          onClose={() => setIsDetailViewOpen(false)}
          invoice={selectedInvoice}
          items={invoiceItems}
        />
      )}
    </>
  );
}
