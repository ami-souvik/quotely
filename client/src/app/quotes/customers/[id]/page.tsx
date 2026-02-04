'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCustomer, updateCustomer } from '@/lib/api/customers';
import { getQuotes } from '@/lib/api/quotes'; // We will filter locally for now
import { Customer, Quote } from '@/lib/types'; // Import Quote type
import { ArrowLeft, Loader2, Save, Mail, Phone, Clock, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface CustomerDetailPageProps {
    params: {
        id: string;
    };
}

const CustomerDetailPage: React.FC<CustomerDetailPageProps> = () => {
    const router = useRouter();
    const params = useParams();
    const customerId = params.id as string;
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [quotes, setQuotes] = useState<Quote[]>([]); // Use Quote type here
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Edit State
    const [editName, setEditName] = useState('');
    const [editEmail, setEditEmail] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editAddress, setEditAddress] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const customerData = await getCustomer(customerId);
                setCustomer(customerData);
                setEditName(customerData.name);
                setEditEmail(customerData.email || '');
                setEditPhone(customerData.phone || '');
                setEditAddress(customerData.address || '');

                // Fetch all quotes and filter (Ideally backend should filter)
                // Since we didn't add a specific endpoint for customer quotes yet, we can't efficiently query by customer ID if we rely on GSI updates that might not be there.
                // However, the prompt says "when we click on it we should see the related Quotations".
                // Let's optimisticly fetch 'mine'. But wait, 'mine' is for logged in user.
                // We need all quotes for the org.
                // Let's use `getQuotes` (which hits `/quotes/mine/`)? No, `getQuotes` hits `/quotes/mine`.
                // Wait, current `getQuotes` function in frontend hits `/quotes/mine/`. That returns quotes for the USER.
                // If the customer belongs to the org, we might want to see any quote for them?
                // But for now let's assume the user can only see quotes they created or if they are admin.
                // Let's fetch quotes and filter by exact customer name or ID if we stored it?
                // We just added `customer_id` to quotes in backend.
                // So for NEW quotes it will match. For old ones, we might need to match by name.

                // Actually, let's just stick to the current available API: `getQuotes` which returns user's quotes.
                // If the user created a quote for this customer, it will show up.

                const myQuotes = await getQuotes();
                // Filter by customer ID if present, else by name
                const related = myQuotes.filter(q =>
                    // We need to cast q to any because type def might not look updated in frontend yet
                    (q as any).customer_id === customerId ||
                    (q.customer_name && q.customer_name.toLowerCase() === customerData.name.toLowerCase())
                );
                setQuotes(related);

            } catch (err: any) {
                setError(err.message || 'Failed to fetch details.');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [customerId]);

    const handleUpdate = async () => {
        if (!customer) return;
        setSaving(true);
        try {
            const updated = await updateCustomer(customer.id, {
                name: editName,
                email: editEmail,
                phone: editPhone,
                address: editAddress,
            });
            setCustomer(updated);
            alert("Customer updated successfully.");
        } catch (e: any) {
            alert("Failed to update: " + e.message);
        } finally {
            setSaving(false);
        }
    }

    if (loading) return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
    if (!customer) return <div className="p-8">Customer not found.</div>;

    return (
        <div className="space-y-6">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to Customers
            </Button>

            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight">{editName}</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Customer Details Card */}
                <Card className="md:col-span-1 h-fit">
                    <CardHeader>
                        <CardTitle>Contact Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="c-name">Name</Label>
                            <Input id="c-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="c-email">Email</Label>
                            <div className="relative">
                                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input id="c-email" className="pl-8" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="c-phone">Phone</Label>
                            <div className="relative">
                                <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input id="c-phone" className="pl-8" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="c-address">Address</Label>
                            <Input id="c-address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
                        </div>

                        <div className="pt-4">
                            <Button onClick={handleUpdate} disabled={saving} className="w-full">
                                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-1 pt-2 border-t">
                            <Clock className="h-3 w-3" /> Created: {new Date(customer.created_at).toLocaleDateString()}
                        </div>
                    </CardContent>
                </Card>

                {/* Quotes List */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle>Related Quotations</CardTitle>
                        <CardDescription>Quotations associated with this customer.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {quotes.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                                No quotations found for this customer.
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Amount</TableHead>
                                        <TableHead className="text-right">Date</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {quotes.map(quote => (
                                        <TableRow key={quote.SK}>
                                            <TableCell>
                                                <Badge variant={quote.status === 'DRAFT' ? 'outline' : 'default'}>{quote.status}</Badge>
                                            </TableCell>
                                            <TableCell>
                                                INR {quote.total_amount?.toFixed(2)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {new Date(quote.created_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm" onClick={() => router.push(`/quotes/${quote.SK.split('#')[1]}`)}>
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CustomerDetailPage;
