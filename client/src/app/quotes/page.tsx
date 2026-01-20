
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api, { useAuthStore } from '@/lib/api/client';
import { getProductFamilies, createProductFamily, updateProductFamily, deleteProductFamily } from '@/lib/api/product-families';
import { ProductFamilySerializer } from '@/lib/types';
import { Plus, Package, Edit, Trash2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

import { createProduct, deleteProduct, getProducts, getProductsByFamily, updateProduct } from '@/lib/api/products';
import { Product } from '@/lib/types';

// Interfaces
interface Quote {
  PK: string; SK: string; status: string; customer_name: string; total_amount: number; created_at: string; s3_pdf_link?: string;
}

const ProductList: React.FC<{ family: ProductFamilySerializer }> = ({ family }) => {
  const familyId = family.id
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setProducts(await getProductsByFamily(family));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch data.');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSave = async () => {
    if (!currentProduct) return;
    try {
      if (currentProduct.id) {
        await updateProduct(currentProduct.id, currentProduct);
      } else {
        await createProduct(currentProduct as Omit<Product, 'id'>);
      }
      setIsProductFormOpen(false);
      setCurrentProduct(null);
      fetchProducts(); // Refresh data
    } catch (err: any) {
      setError(err.message || 'Failed to save product.');
    }
  };

  const handleProductDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await deleteProduct(id);
        fetchProducts(); // Refresh data
      } catch (err: any) {
        setError(err.message || 'Failed to delete product.');
      }
    }
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const productsResponse = await getProductsByFamily(family);
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

  return (
    <div>
      <div className='px-4 mb-2 flex justify-between items-center text-xs'>
        <h4 className="text-xs font-semibold">Products</h4>
        {
          isProductFormOpen ? <div>
            <Button onClick={() => setIsProductFormOpen(false)} variant="secondary" className='text-xs'>Cancel</Button>
            <Button onClick={handleProductSave} className='text-xs'>Save</Button>
          </div>
            : <Button onClick={() => { setCurrentProduct({ family_id: familyId }); setIsProductFormOpen(true); }} className='text-xs'>Add Product</Button>
        }
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='h-3 text-xs'>Name</TableHead>
            <TableHead className='h-3 text-xs'>Description</TableHead>
            <TableHead className="h-3 text-xs text-right">Price (INR)</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {isProductFormOpen && <TableRow>
            <TableCell className='p-0 px-2'>
              <Input id="name" value={currentProduct?.name || ''} onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })} className="text-xs col-span-3" />
            </TableCell>
            <TableCell className='p-0 px-2'>
              <Input id="description" value={currentProduct?.description || ''} onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })} className="text-xs col-span-3" />
            </TableCell>
            <TableCell className="p-0 px-2">
              <Input id="price" type="number" value={currentProduct?.price || ''} onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) })} className="text-xs col-span-3" />
            </TableCell>
            <TableCell />
          </TableRow>}
          {products.map(product => (
            <TableRow key={product.id}>
              <TableCell className='p-0 px-2 text-xs'>{product.name}</TableCell>
              <TableCell className='p-0 px-2 text-xs'>{product.description}</TableCell>
              <TableCell className="p-0 px-2 text-xs text-right">{product.price}</TableCell>
              <TableCell className="p-2 pl-0">
                <Button variant="ghost" size="icon" onClick={() => handleProductDelete(product.id)}>
                  <Trash2 className="h-5 w-5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
          {products.length === 0 && <TableRow>
            <p className="p-4">No products found for this family.</p>
          </TableRow>}
        </TableBody>
      </Table>
    </div>
  );
};


const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const router = useRouter();

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [families, setFamilies] = useState<ProductFamilySerializer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentFamily, setCurrentFamily] = useState<ProductFamilySerializer | null>(null);
  const [expandedFamilies, setExpandedFamilies] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      const fetchData = async () => {
        try {
          setLoading(true);
          const [quotesRes, familiesRes] = await Promise.all([
            api.get('/quotes/mine/'),
            user.role === 'ADMIN' ? getProductFamilies() : Promise.resolve([])
          ]);
          setQuotes(quotesRes.data);
          setFamilies(familiesRes);
        } catch (err) {
          console.error("Failed to fetch data", err);
          setError("Failed to fetch data. Please try again.");
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [user]);

  const handleCreate = () => {
    setCurrentFamily(null);
    setIsFormOpen(true);
  };

  const handleEdit = (family: ProductFamilySerializer) => {
    setCurrentFamily(family);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this product family?')) {
      try {
        await deleteProductFamily(id);
        setFamilies(families.filter((f) => f.id !== id));
      } catch (err) {
        setError('Failed to delete product family.');
      }
    }
  };

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

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Partial<ProductFamilySerializer> = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string, // Add category from form
    };

    try {
      if (currentFamily) {
        const updatedFamily = await updateProductFamily(currentFamily.id, {
          ...currentFamily,
          ...data,
          default_items: currentFamily.default_items || [], // Ensure default_items is not undefined
        });
        setFamilies(families.map((f) => (f.id === updatedFamily.id ? updatedFamily : f)));
      } else {
        const newFamily = await createProductFamily({
          ...data,
          default_items: [], // Always send an empty array for new families
        } as ProductFamilySerializer);
        setFamilies([...families, newFamily]);
      }
      setIsFormOpen(false);
    } catch (err) {
      setError('Failed to save product family.');
    }
  };

  return (
    <>
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => router.push('/quotes/new')}>
            <Plus className="mr-2 h-4 w-4" /> New Quote
          </Button>
        </div>
      </div>

      {/* My Quotes Section */}
      <section>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {loading ? (
            <p className="text-muted-foreground">Loading quotes...</p>
          ) : quotes.length > 0 ? (
            quotes.map(quote => (
              <Card key={quote.SK}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{quote.customer_name}</CardTitle>
                  <Badge variant={quote.status === 'DRAFT' ? 'outline' : 'default'}>{quote.status}</Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">INR {quote.total_amount.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground">
                    Created on {new Date(quote.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
                <CardFooter>
                  <Button className="w-full">
                    View Quote
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <div className="col-span-full text-center py-10">
              <p className="text-muted-foreground">You haven&apos;t created any quotes yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Admin Section */}
      {user?.role === 'ADMIN' && (
        <section className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold tracking-tight">Admin</h3>
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleCreate}>
                  <Plus className="mr-2 h-4 w-4" /> Add Family
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{currentFamily ? 'Edit Product Family' : 'Add Product Family'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium">Name</label>
                    <Input id="name" name="name" defaultValue={currentFamily?.name} required />
                  </div>
                  <div>
                    <label htmlFor="category" className="block text-sm font-medium">Category</label>
                    <Input id="category" name="category" defaultValue={currentFamily?.category} required />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium">Description</label>
                    <Textarea id="description" name="description" defaultValue={currentFamily?.description} />
                  </div>
                  <Button type="submit">{currentFamily ? 'Save Changes' : 'Create Family'}</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>Product Families</CardTitle>
                <CardDescription>Manage your product families and their products.</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? <p className="px-4 text-muted-foreground">Loading...</p> : error ? <p className="text-red-500">{error}</p> : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {families.map(family => (
                        <React.Fragment key={family.id}>
                          <TableRow>
                            <TableCell>{family.name}</TableCell>
                            <TableCell>{family.category}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => toggleFamilyProducts(family.id)}>
                                <FolderOpen className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleEdit(family)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDelete(family.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedFamilies.has(family.id) && (
                            <TableRow>
                              <TableCell colSpan={3} className='bg-gray-100 p-0 py-2'>
                                <ProductList family={family} />
                              </TableCell>
                            </TableRow>
                          )}
                        </React.Fragment>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Master Items</CardTitle>
                <CardDescription>Manage your global list of materials and labor items.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center items-center h-full">
                  <Package className="h-16 w-16 text-muted-foreground" />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full">Manage Items</Button>
              </CardFooter>
            </Card>
          </div>
        </section>
      )}
    </>
  );
};

export default DashboardPage;
