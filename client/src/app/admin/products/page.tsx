'use client';

import React, in_progress, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getProducts, createProduct, updateProduct, deleteProduct } from '@/lib/api/products';
import { getProductFamilies } from '@/lib/api/product-families';
import { Product, ProductFamilySerializer } from '@/lib/types';
import { useAuthStore } from '@/lib/api/client';

const ProductsPage: React.FC = () => {
    const { user } = useAuthStore();
    const [products, setProducts] = useState<Product[]>([]);
    const [productFamilies, setProductFamilies] = useState<ProductFamilySerializer[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);

    const fetchProductsAndFamilies = async () => {
        try {
            setLoading(true);
            const [productsResponse, familiesResponse] = await Promise.all([
                getProducts(),
                getProductFamilies(),
            ]);
            setProducts(productsResponse);
            setProductFamilies(familiesResponse);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            fetchProductsAndFamilies();
        }
    }, [user]);

    const handleSave = async () => {
        if (!currentProduct) return;

        try {
            if (currentProduct.id) {
                await updateProduct(currentProduct.id, currentProduct);
            } else {
                await createProduct(currentProduct as Omit<Product, 'id'>);
            }
            setIsDialogOpen(false);
            setCurrentProduct(null);
            fetchProductsAndFamilies(); // Refresh data
        } catch (err: any) {
            setError(err.message || 'Failed to save product.');
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await deleteProduct(id);
                fetchProductsAndFamilies(); // Refresh data
            } catch (err: any) {
                setError(err.message || 'Failed to delete product.');
            }
        }
    };

    if (user?.role !== 'ADMIN') {
        return <div className="p-4">Access Denied. You must be an admin to view this page.</div>;
    }

    if (loading) {
        return <div className="p-4">Loading...</div>;
    }

    if (error) {
        return <div className="p-4 text-red-500">{error}</div>;
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Product Management</h1>
                <Button onClick={() => { setCurrentProduct({}); setIsDialogOpen(true); }}>Add Product</Button>
            </div>

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Family</TableHead>
                        <TableHead>Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {products.map((product) => (
                        <TableRow key={product.id}>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>{product.description}</TableCell>
                            <TableCell>INR {product.price}</TableCell>
                            <TableCell>{productFamilies.find(f => f.id === product.family_id)?.name || 'N/A'}</TableCell>
                            <TableCell>
                                <Button variant="outline" size="sm" onClick={() => { setCurrentProduct(product); setIsDialogOpen(true); }}>Edit</Button>
                                <Button variant="destructive" size="sm" className="ml-2" onClick={() => handleDelete(product.id)}>Delete</Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentProduct?.id ? 'Edit Product' : 'Add Product'}</DialogTitle>
                        <DialogDescription>
                            Fill in the details for the product.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" value={currentProduct?.name || ''} onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Description</Label>
                            <Input id="description" value={currentProduct?.description || ''} onChange={(e) => setCurrentProduct({ ...currentProduct, description: e.target.value })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="price" className="text-right">Price</Label>
                            <Input id="price" type="number" value={currentProduct?.price || ''} onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) })} className="col-span-3" />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="family" className="text-right">Product Family</Label>
                            <Select
                                value={currentProduct?.family_id || ''}
                                onValueChange={(value) => setCurrentProduct({ ...currentProduct, family_id: value === 'none' ? null : value })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Select a family" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {productFamilies.map(family => (
                                        <SelectItem key={family.id} value={family.id}>{family.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProductsPage;
