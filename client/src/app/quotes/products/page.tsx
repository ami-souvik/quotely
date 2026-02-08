'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    getProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    getProductSettings,
    updateProductSettings
} from '@/lib/api/products';
import {
    getProductFamilies,
    createProductFamily,
    updateProductFamily,
    deleteProductFamily
} from '@/lib/api/product-families';
import { Product, ProductFamilySerializer, ProductColumn } from '@/lib/types';
import { useSession } from 'next-auth/react';
import { GripVertical, Plus, Trash2, Settings, Edit, FolderOpen, Info } from 'lucide-react';

const evaluateFormula = (formula: string, product: Product, columns: ProductColumn[], families: ProductFamilySerializer[]) => {
    try {
        const context: Record<string, any> = { ...product };
        context['family'] = families.find(f => f.id === product.family_id)?.name || '';

        if (product.custom_fields) {
            Object.assign(context, product.custom_fields);
        }

        columns.forEach(col => {
            if (!(col.key in context)) {
                context[col.key] = 0;
            }
        });

        const keys = Object.keys(context);
        const values = keys.map(k => context[k]);

        // limited scope evaluation
        // eslint-disable-next-line
        return new Function(...keys, `return ${formula}`)(...values);
    } catch (e) {
        return '#ERR';
    }
};


type UIProductColumn = ProductColumn & { _id: string };

const ProductsPage: React.FC = () => {
    const { data: session } = useSession();
    const user = session?.user;
    const [activeTab, setActiveTab] = useState<'products' | 'families'>('products');

    // Data States
    const [products, setProducts] = useState<Product[]>([]);
    const [productFamilies, setProductFamilies] = useState<ProductFamilySerializer[]>([]);
    const [columns, setColumns] = useState<UIProductColumn[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Product Dialog States
    const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product> | null>(null);

    // Family Dialog States
    const [isFamilyDialogOpen, setIsFamilyDialogOpen] = useState(false);
    const [currentFamily, setCurrentFamily] = useState<Partial<ProductFamilySerializer> | null>(null);

    // Settings Dialog State
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Initial Data Fetch
    const fetchAllData = async () => {
        try {
            setLoading(true);
            const [productsResponse, familiesResponse, settingsResponse] = await Promise.all([
                getProducts(),
                getProductFamilies(),
                getProductSettings()
            ]);
            setProducts(productsResponse);
            setProductFamilies(familiesResponse);

            let fetchedColumns = settingsResponse;
            if (!fetchedColumns || fetchedColumns.length === 0) {
                fetchedColumns = [
                    { key: 'name', label: 'Name', type: 'text', editable: true },
                    { key: 'price', label: 'Price', type: 'number', editable: true },
                    { key: 'family', label: 'Family', type: 'text', editable: true } // Visual type 'text', handled as relation in UI
                ];
            }

            setColumns(fetchedColumns.map((col: ProductColumn) => ({ ...col, _id: Math.random().toString(36).substr(2, 9) })));
        } catch (err: any) {
            setError(err.message || 'Failed to fetch data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user?.role === 'ADMIN') {
            fetchAllData();
        }
    }, [user]);

    // --- Product Handlers ---
    const handleSaveProduct = async () => {
        if (!currentProduct) return;
        try {
            const productData = { ...currentProduct };
            if (productData.price) productData.price = parseFloat(productData.price.toString());

            if (productData.id) {
                await updateProduct(productData.id, productData);
            } else {
                await createProduct(productData as Omit<Product, 'id'>);
            }
            setIsProductDialogOpen(false);
            setCurrentProduct(null);
            fetchAllData();
        } catch (err: any) {
            setError(err.message || 'Failed to save product.');
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                await deleteProduct(id);
                fetchAllData();
            } catch (err: any) {
                setError(err.message || 'Failed to delete product.');
            }
        }
    };

    // --- Family Handlers ---
    const handleSaveFamily = async () => {
        if (!currentFamily) return;
        try {
            const familyData = { ...currentFamily } as ProductFamilySerializer;
            // Ensure proper types
            if (familyData.base_margin) familyData.base_margin = parseFloat(familyData.base_margin.toString());

            // Default items empty if new
            if (!familyData.default_items) familyData.default_items = [];

            if (familyData.id) {
                // Remove category from updates if it persists in object but not in type (safety)
                // @ts-ignore
                const { category, ...rest } = familyData;
                // @ts-ignore
                await updateProductFamily(familyData.id, rest);
            } else {
                await createProductFamily(familyData as Omit<ProductFamilySerializer, 'id'>);
            }
            setIsFamilyDialogOpen(false);
            setCurrentFamily(null);
            fetchAllData();
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Failed to save family.');
        }
    };

    const handleDeleteFamily = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this family? Products in this family will reference a non-existent family.')) {
            try {
                await deleteProductFamily(id);
                fetchAllData();
            } catch (err: any) {
                setError(err.message || 'Failed to delete family.');
            }
        }
    };

    // --- Settings Handlers ---
    const handleAddColumn = () => {
        const newColumn: UIProductColumn = {
            key: `field_${Date.now()}`,
            label: 'New Field',
            type: 'text',
            editable: true,
            _id: Math.random().toString(36).substr(2, 9)
        };
        setColumns([...columns, newColumn]);
    };

    const handleUpdateColumn = (index: number, updates: Partial<UIProductColumn>) => {
        const newColumns = [...columns];
        newColumns[index] = { ...newColumns[index], ...updates };
        setColumns(newColumns);
    };

    const handleDeleteColumn = (index: number) => {
        const newColumns = columns.filter((_, i) => i !== index);
        setColumns(newColumns);
    };

    const saveSettings = async () => {
        // Validate keys
        const keys = columns.map(c => c.key);
        const uniqueKeys = new Set(keys);
        if (keys.length !== uniqueKeys.size) {
            alert('Column keys must be unique. Please fix duplicate keys.');
            return;
        }

        // Validate empty keys
        if (columns.some(c => !c.key.trim())) {
            alert('Column keys cannot be empty.');
            return;
        }

        try {
            await updateProductSettings(columns);
            setIsSettingsOpen(false);
            fetchAllData();
        } catch (err: any) {
            setError(err.message || 'Failed to save settings.');
        }
    };

    // Drag and Drop
    const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);

    const onDragStart = (e: React.DragEvent, index: number) => {
        setDraggedColumnIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const onDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedColumnIndex === null || draggedColumnIndex === index) return;
        const newCols = [...columns];
        const draggedItem = newCols[draggedColumnIndex];
        newCols.splice(draggedColumnIndex, 1);
        newCols.splice(index, 0, draggedItem);
        setColumns(newCols);
        setDraggedColumnIndex(index);
    };

    const onDragEnd = () => {
        setDraggedColumnIndex(null);
    };


    if (user?.role !== 'ADMIN') {
        return <div className="p-4">Access Denied.</div>;
    }

    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-red-500">{error}</div>;

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Product Management</h1>
            </div>

            {/* Tabs Navigation */}
            <div className="flex space-x-2 border-b mb-6">
                <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'products'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    onClick={() => setActiveTab('products')}
                >
                    Products
                </button>
                <button
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'families'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                        }`}
                    onClick={() => setActiveTab('families')}
                >
                    Families
                </button>
            </div>

            {/* Content: Products */}
            {activeTab === 'products' && (
                <div>
                    <div className="flex justify-end gap-2 mb-4">
                        <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
                            <Settings className="mr-2 h-4 w-4" /> Configure Columns
                        </Button>
                        <Button onClick={() => { setCurrentProduct({}); setIsProductDialogOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" /> Add Product
                        </Button>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                {columns.map((col) => (
                                    <TableHead key={col.key}>{col.label}</TableHead>
                                ))}
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.length === 0 && <TableRow><TableCell colSpan={columns.length + 1} className="text-center">No products found.</TableCell></TableRow>}
                            {products.map((product) => (
                                <TableRow key={product.id}>
                                    {columns.map((col) => {
                                        let content: React.ReactNode = '';
                                        if (col.key === 'name') content = product.name;
                                        else if (col.key === 'price') content = `INR ${product.price}`;
                                        else if (col.key === 'family') content = productFamilies.find(f => f.id === product.family_id)?.name || 'N/A';
                                        else if (col.type === 'formula' && col.formula) {
                                            content = evaluateFormula(col.formula, product, columns, productFamilies);
                                        }
                                        else {
                                            content = product.custom_fields?.[col.key] || '-';
                                        }
                                        return <TableCell key={col.key}>{content}</TableCell>;
                                    })}
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => { setCurrentProduct(product); setIsProductDialogOpen(true); }}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteProduct(product.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Content: Families */}
            {activeTab === 'families' && (
                <div>
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => { setCurrentFamily({}); setIsFamilyDialogOpen(true); }}>
                            <Plus className="mr-2 h-4 w-4" /> Add Family
                        </Button>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Base Margin (%)</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {productFamilies.length === 0 && <TableRow><TableCell colSpan={4} className="text-center">No families found.</TableCell></TableRow>}
                            {productFamilies.map((family) => (
                                <TableRow key={family.id}>
                                    <TableCell className="font-medium">{family.name}</TableCell>
                                    <TableCell>{family.description || '-'}</TableCell>
                                    <TableCell>{(family.base_margin * 100).toFixed(0)}%</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" onClick={() => { setCurrentFamily(family); setIsFamilyDialogOpen(true); }}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteFamily(family.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* --- Dialogs --- */}

            {/* Product Dialog */}
            <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{currentProduct?.id ? 'Edit Product' : 'Add Product'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        {columns.map(col => {
                            if (col.key === 'name') {
                                return (
                                    <div className="grid grid-cols-4 items-center gap-4" key={col.key}>
                                        <Label className="text-right">{col.label}</Label>
                                        <Input
                                            value={currentProduct?.name || ''}
                                            onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
                                            className="col-span-3"
                                        />
                                    </div>
                                );
                            }
                            if (col.key === 'price') {
                                return (
                                    <div className="grid grid-cols-4 items-center gap-4" key={col.key}>
                                        <Label className="text-right">{col.label}</Label>
                                        <Input
                                            type="number"
                                            value={currentProduct?.price || ''}
                                            onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) })}
                                            className="col-span-3"
                                        />
                                    </div>
                                );
                            }
                            if (col.key === 'family') {
                                return (
                                    <div className="grid grid-cols-4 items-center gap-4" key={col.key}>
                                        <Label className="text-right">{col.label}</Label>
                                        <Select
                                            value={currentProduct?.family_id || 'none'}
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
                                );
                            }
                            if (col.type === 'formula') {
                                const val = evaluateFormula(col.formula || '', currentProduct as Product, columns, productFamilies);
                                return (
                                    <div className="grid grid-cols-4 items-center gap-4" key={col.key}>
                                        <Label className="text-right">{col.label}</Label>
                                        <Input
                                            value={val?.toString() || ''}
                                            disabled
                                            className="col-span-3 bg-muted"
                                        />
                                    </div>
                                );
                            }
                            // Custom Fields
                            return (
                                <div className="grid grid-cols-4 items-center gap-4" key={col.key}>
                                    <Label className="text-right">{col.label}</Label>
                                    <Input
                                        value={currentProduct?.custom_fields?.[col.key] || ''}
                                        onChange={(e) => {
                                            const newCustomFields = { ...(currentProduct?.custom_fields || {}) };
                                            newCustomFields[col.key] = e.target.value;
                                            setCurrentProduct({ ...currentProduct, custom_fields: newCustomFields });
                                        }}
                                        className="col-span-3"
                                    />
                                </div>
                            );
                        })}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsProductDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveProduct}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Family Dialog */}
            <Dialog open={isFamilyDialogOpen} onOpenChange={setIsFamilyDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentFamily?.id ? 'Edit Family' : 'Add Family'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="fam-name" className="text-right">Name</Label>
                            <Input
                                id="fam-name"
                                value={currentFamily?.name || ''}
                                onChange={(e) => setCurrentFamily({ ...currentFamily, name: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="fam-desc" className="text-right">Description</Label>
                            <Textarea
                                id="fam-desc"
                                value={currentFamily?.description || ''}
                                onChange={(e) => setCurrentFamily({ ...currentFamily, description: e.target.value })}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="fam-margin" className="text-right">Base Margin</Label>
                            <Input
                                id="fam-margin"
                                type="number"
                                step="0.01"
                                placeholder="0.20 for 20%"
                                value={currentFamily?.base_margin || ''}
                                onChange={(e) => setCurrentFamily({ ...currentFamily, base_margin: parseFloat(e.target.value) })}
                                className="col-span-3"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFamilyDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveFamily}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Settings Dialog */}
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Configure Columns</DialogTitle>
                        <DialogDescription>Add, remove, and reorder columns.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2 max-h-[60vh] overflow-y-auto">
                        {columns.map((col, index) => (
                            <div
                                key={col._id}
                                className="flex flex-col gap-2 border p-2 rounded bg-card"
                                draggable
                                onDragStart={(e) => onDragStart(e, index)}
                                onDragOver={(e) => onDragOver(e, index)}
                                onDragEnd={onDragEnd}
                            >
                                <div className="flex items-center gap-2">
                                    <GripVertical className="cursor-grab text-muted-foreground" />
                                    <div className="grid grid-cols-3 gap-2 flex-1">
                                        <Input
                                            value={col.label}
                                            onChange={(e) => handleUpdateColumn(index, { label: e.target.value })}
                                            placeholder="Column Label"
                                        />
                                        <Select
                                            value={col.type}
                                            onValueChange={(val: any) => handleUpdateColumn(index, { type: val })}
                                            disabled={['name', 'price', 'family'].includes(col.key)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="text">Text</SelectItem>
                                                <SelectItem value="number">Number</SelectItem>
                                                <SelectItem value="boolean">Boolean</SelectItem>
                                                <SelectItem value="date">Date</SelectItem>
                                                <SelectItem value="formula">Formula</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            value={col.key}
                                            onChange={(e) => handleUpdateColumn(index, { key: e.target.value })}
                                            disabled={['name', 'price', 'family'].includes(col.key)}
                                            className={['name', 'price', 'family'].includes(col.key) ? "bg-muted" : ""}
                                            placeholder="Field Key (unique)"
                                        />
                                    </div>
                                    {!['name', 'price', 'family'].includes(col.key) && (
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteColumn(index)}>
                                            <Trash2 className="h-4 w-4 text-red-500" />
                                        </Button>
                                    )}
                                </div>
                                {col.type === 'formula' && (
                                    <div className="flex items-center gap-2 pl-8">
                                        <Label className="w-16 text-xs font-semibold text-muted-foreground">Formula:</Label>
                                        <Input
                                            value={col.formula || ''}
                                            onChange={(e) => handleUpdateColumn(index, { formula: e.target.value })}
                                            placeholder="e.g. price * 1.18"
                                            className="flex-1 h-8 text-sm"
                                        />
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                                                </TooltipTrigger>
                                                <TooltipContent>
                                                    <p className="font-semibold">Formula Syntax:</p>
                                                    <p className="text-xs">Use standard JS math operators.</p>
                                                    <p className="text-xs mt-1">Example: <code>price * 1.2</code></p>
                                                    <p className="text-xs mt-1">Reference any field key (e.g. {columns[0]?.key}).</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                )}
                            </div>
                        ))}
                        <Button variant="outline" className="w-full mt-2" onClick={handleAddColumn}>
                            <Plus className="mr-2 h-4 w-4" /> Add Field
                        </Button>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>Cancel</Button>
                        <Button onClick={saveSettings}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProductsPage;
