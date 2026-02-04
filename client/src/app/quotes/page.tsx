'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api, { useAuthStore } from '@/lib/api/client';
import { getProductFamilies } from '@/lib/api/product-families';
import { ProductFamilySerializer, Product } from '@/lib/types';
import { Plus, Package, FolderOpen, Settings, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardIcon, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getProductsByFamily } from '@/lib/api/products';
import { deleteQuote } from '@/lib/api/quotes';
import { useAuth } from 'react-oidc-context';

// Interfaces
interface Quote {
  PK: string; SK: string; status: string; customer_name: string; total_amount: number; created_at: string; s3_pdf_link?: string;
}

// Read-only Product List for Dashboard Preview
const ProductListPreview: React.FC<{ family: ProductFamilySerializer }> = ({ family }) => {
  const familyId = family.id
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Only passing ID now as category is removed
        const productsResponse = await getProductsByFamily({ id: familyId });
        setProducts(productsResponse);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch products.');
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [familyId]);

  if (loading) return <p className="p-4 text-xs">Loading products...</p>;
  if (error) return <p className="px-4 text-xs text-red-500">{error}</p>;
  if (products.length === 0) return <p className="p-4 text-xs text-muted-foreground">No products in this family.</p>;

  return (
    <div className="px-4 pb-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='h-8 text-xs'>Name</TableHead>
            <TableHead className="h-8 text-xs text-right">Price (INR)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map(product => (
            <TableRow key={product.id}>
              <TableCell className='py-2 text-xs'>{product.name}</TableCell>
              <TableCell className="py-2 text-xs text-right">{product.price}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};


const DashboardPage: React.FC = () => {
  const auth = useAuth();
  const { user } = useAuthStore();
  const router = useRouter();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [families, setFamilies] = useState<ProductFamilySerializer[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          setLoading(true);
          const [quotesRes, familiesRes] = await Promise.all([
            api.get('/quotes/mine/'),
            // Only fetch families if admin, though preview is nice for everyone? 
            // The prompt implies dashboard preview of families.
            user.role === 'ADMIN' ? getProductFamilies() : Promise.resolve([])
          ]);
          setQuotes(quotesRes.data);
          setFamilies(familiesRes);
        } catch (err) {
          console.error("Failed to fetch data", err);
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  const toggleFamilyProducts = (familyId: string) => {
    setExpandedFamilies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(familyId)) {
        newSet.delete(familyId);
      } else {
        newSet.add(familyId);
      }
      return newSet;
    });
  };

  const handleQuoteDelete = async (sk: string) => {
    if (window.confirm('Are you sure you want to delete this quote?')) {
      const quoteId = sk.split('#')[1];
      try {
        await deleteQuote(quoteId);
        setQuotes(quotes.filter(q => q.SK !== sk));
      } catch (err) {
        console.error('Failed to delete quote.', err);
      }
    }
  };

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          {user?.role === 'ADMIN' && (
            <Button variant="outline" onClick={() => router.push('/quotes/products')}>
              <Settings className="mr-2 h-4 w-4" /> Manage Products
            </Button>
          )}
          <Button onClick={() => router.push('/quotes/editor')}>
            <Plus className="mr-2 h-4 w-4" /> New Quote
          </Button>
        </div>
      </div>

      {/* My Quotes Section */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-4">My Quotes</h3>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading && quotes.length === 0 ? (
            <p className="text-muted-foreground">Loading quotes...</p>
          ) : quotes.length > 0 ? (
            quotes.map(quote => (
              <Card key={quote.SK}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium truncate pr-4">{quote.customer_name}</CardTitle>
                  <Badge variant={quote.status === 'DRAFT' ? 'outline' : 'default'} className="shrink-0">{quote.status}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">INR {quote.total_amount.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(quote.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-between gap-2 pt-0">
                  <Button variant="ghost" size="sm" onClick={() => router.push(`/quotes/${quote.SK.split('#')[1]}`)}>
                    View
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleQuoteDelete(quote.SK)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full py-8 border rounded-lg border-dashed text-center">
              <p className="text-muted-foreground">You have not created any quotes yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Admin Section: Product Families Preview */}
      {user?.role === 'ADMIN' && (
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Product Overview</h3>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common admin tasks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 grid gap-4 grid-cols-4">
              <Button className="w-full justify-start" variant="outline" onClick={() => router.push('/quotes/products')}>
                <Package className="mr-2 h-4 w-4" /> Manage Catalog
              </Button>
            </CardContent>
          </Card>
        </section>
      )}
    </>
  );
};

export default DashboardPage;
