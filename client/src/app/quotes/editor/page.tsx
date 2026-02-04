'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api, { useAuthStore } from '@/lib/api/client';
import { QuoteFamily, QuoteItem, ProductFamilySerializer, ProductColumn, Customer } from '@/lib/types';
import { getProductsByFamily, getProductSettings } from '@/lib/api/products';
import { getQuote, updateQuote } from '@/lib/api/quotes';
import { getProductFamilies } from '@/lib/api/product-families';
import { getCustomers } from '@/lib/api/customers';
import { CirclePlus, Loader2, Trash2, Plus, X, Search, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";

import { Label } from "@/components/ui/label";

const QuoteEditorContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('id');
  const { user, selectedProductFamilies, setProductFamiliesForQuote } = useAuthStore();
  const [quoteFamilies, setQuoteFamilies] = useState<QuoteFamily[]>([]);

  // Customer State
  const [customerName, setCustomerName] = useState<string>('');
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string | null>(null);
  const [customerPhone, setCustomerPhone] = useState<string | null>(null);

  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Filter customers logic
  const filteredCustomers = allCustomers.filter(c => {
    const query = customerName.toLowerCase();
    if (!query) return true;
    return (
      c.name.toLowerCase().includes(query) ||
      (c.email && c.email.toLowerCase().includes(query)) ||
      (c.phone && c.phone.replace(/\D/g, '').includes(query.replace(/\D/g, '')))
    );
  });

  const handleCustomerSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomerName(val);
    setShowSuggestions(true);
    setCustomerId(null);
    setCustomerEmail(null);
    setCustomerPhone(null);
  };

  const selectCustomer = (customer: Customer) => {
    setCustomerName(customer.name);
    setCustomerId(customer.id);
    setCustomerEmail(customer.email || null);
    setCustomerPhone(customer.phone || null);
    setShowSuggestions(false);
  };

  // Custom Fields State
  const [customColumns, setCustomColumns] = useState<ProductColumn[]>([]);

  // Add Family Dialog State
  const [isAddFamilyOpen, setIsAddFamilyOpen] = useState(false);
  const [allFamilies, setAllFamilies] = useState<ProductFamilySerializer[]>([]);
  const [selectedFamiliesToAdd, setSelectedFamiliesToAdd] = useState<ProductFamilySerializer[]>([]);
  const [loadingFamilies, setLoadingFamilies] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      try {
        // Fetch custom settings
        const settings = await getProductSettings();
        // Filter out system columns that we handle explicitly in specific positions
        // System columns usually: name, price, family, etc.
        // We want to show other custom columns.
        const filteredCols = settings.filter(c => !['name', 'price', 'family', 'qty', 'total', 'unit_type'].includes(c.key));
        setCustomColumns(filteredCols);

        // Fetch Customers
        try {
          const customersData = await getCustomers();
          setAllCustomers(customersData);
        } catch (e) {
          console.error("Failed to fetch customers", e);
        }

        if (quoteId) {
          // Editing existing quote
          const quote = await getQuote(quoteId);
          const details = quote.snapshot as any || quote;
          setCustomerName(details.customer_name);
          // Set additional customer details if present in snapshot/quote
          // Note: Backend 'getQuote' usually returns 'Item' from DynamoDB. 
          // If 'snapshot' is present, it might have it. Or the top level item.
          setCustomerId(details.customer_id || null);
          setCustomerEmail(details.customer_email || null);
          setCustomerPhone(details.customer_phone || null);
          setQuoteFamilies(details.families || []);
        } else if (selectedProductFamilies.length > 0) {
          // Creating new quote from selection (passed from previous page, though we are merging functionality)
          await addFamiliesToQuote(selectedProductFamilies);
          // Clear the global selection after consuming
          setProductFamiliesForQuote([]);
        }

        // If we want to auto-open dialog if empty:
        // if (!quoteId && selectedProductFamilies.length === 0) setIsAddFamilyOpen(true);

      } catch (err: any) {
        setError(err.message || 'Failed to initialize quote editor.');
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [quoteId, router]); // Removed selectedProductFamilies from dep to avoid loop if we clear it

  // State to store products for each family to display in the drawer
  const [familyProductsMap, setFamilyProductsMap] = useState<Record<string, any[]>>({});

  // Separate effect to fetch families for the dialog
  useEffect(() => {
    const fetchFamiliesAndProducts = async () => {
      try {
        const families = await getProductFamilies();
        setAllFamilies(families);

        // Fetch products for all families
        const productsMap: Record<string, any[]> = {};
        await Promise.all(families.map(async (family) => {
          try {
            const products = await getProductsByFamily(family);
            productsMap[family.id] = products;
          } catch (e) {
            console.error(`Failed to fetch products for family ${family.id}`, e);
            productsMap[family.id] = [];
          }
        }));
        setFamilyProductsMap(productsMap);

      } catch (e) {
        console.error("Failed to fetch families", e);
      }
    };
    fetchFamiliesAndProducts();
  }, []);

  const addFamiliesToQuote = async (families: ProductFamilySerializer[]) => {
    const familiesWithProducts = await Promise.all(
      families.map(async (family) => {
        const products = await getProductsByFamily(family);
        const items: QuoteItem[] = products.map(product => ({
          id: product.id,
          name: product.name,
          qty: 1,
          unit_price: product.price,
          unit_type: 'unit',
          total: product.price,
          // Spread custom fields
          ...product.custom_fields
        }));

        const subtotal = items.reduce((acc, item) => acc + (item.qty * item.unit_price), 0);

        return {
          family_id: family.id,
          family_name: family.name,
          category: family.description || '',
          items: items,
          subtotal: subtotal,
          margin_applied: family.base_margin || 0,
        };
      })
    );

    setQuoteFamilies(prev => [...prev, ...familiesWithProducts]);
  };

  const calculateFamilySubtotal = useCallback((family: QuoteFamily) => {
    let subtotal = 0;
    family.items.forEach(item => {
      subtotal += item.qty * item.unit_price;
    });
    return subtotal;
  }, []);

  const calculateGrandTotal = useCallback(() => {
    let grandTotal = 0;
    quoteFamilies.forEach(family => {
      let subtotal = calculateFamilySubtotal(family);
      grandTotal += subtotal * (1 + family.margin_applied);
    });
    return grandTotal;
  }, [quoteFamilies, calculateFamilySubtotal]);

  // Update family subtotals when items change
  useEffect(() => {
    setQuoteFamilies(currentFamilies =>
      currentFamilies.map(f => ({
        ...f,
        subtotal: calculateFamilySubtotal(f)
      }))
    );
  }, [JSON.stringify(quoteFamilies.map(f => f.items))]);

  const handleItemChange = (familyIndex: number, itemIndex: number, field: string, value: any) => {
    setQuoteFamilies(prevFamilies =>
      prevFamilies.map((family, fIdx) => {
        if (fIdx !== familyIndex) return family;
        const newItems = [...family.items];
        // Handle nested or direct property
        const newItem = { ...newItems[itemIndex], [field]: value };
        // Recalculate total if qty or unit_price changes
        if (field === 'qty' || field === 'unit_price') {
          newItem.total = (newItem.qty || 0) * (newItem.unit_price || 0);
        }
        newItems[itemIndex] = newItem;
        return { ...family, items: newItems };
      })
    );
  };

  const handleAddItem = (familyIndex: number) => {
    const newItem: QuoteItem = {
      id: String(Math.random()),
      name: 'New Custom Item',
      qty: 1,
      unit_price: 0,
      unit_type: 'unit',
      total: 0,
    };
    // Initialize custom fields with empty strings
    customColumns.forEach(col => {
      (newItem as any)[col.key] = '';
    });

    setQuoteFamilies(prevFamilies =>
      prevFamilies.map((family, fIdx) => {
        if (fIdx !== familyIndex) return family;
        return { ...family, items: [...family.items, newItem] };
      })
    );
  };

  const handleRemoveItem = (familyIndex: number, itemIndex: number) => {
    setQuoteFamilies(prevFamilies =>
      prevFamilies.map((family, fIdx) => {
        if (fIdx !== familyIndex) return family;
        const newItems = [...family.items];
        newItems.splice(itemIndex, 1);
        return { ...family, items: newItems };
      })
    );
  };

  const handleRemoveFamily = (familyIndex: number) => {
    if (window.confirm('Are you sure you want to remove this family and all its items?')) {
      setQuoteFamilies(prevFamilies => prevFamilies.filter((_, index) => index !== familyIndex));
    }
  };

  const handleSaveQuote = async () => {
    // Check if customer name is empty
    if (!customerName || customerName.trim() === '') {
      setError('Customer Name is required.');
      alert('Please enter a customer name.');
      return;
    }

    if (quoteFamilies.length === 0) {
      setError('Please add at least one product family.');
      alert('Please add at least one product family.');
      return;
    }

    if (!user?.org_id) {
      setError('User organization not found. Cannot save quote.');
      return;
    }
    setLoading(true);
    setError(null);

    const quoteData = {
      customer_name: customerName || 'Untitled Customer',
      families: quoteFamilies.map(family => ({
        family_id: family.family_id,
        family_name: family.family_name,
        category: family.category,
        items: family.items,
        subtotal: family.subtotal,
        margin_applied: family.margin_applied,
      })),
      total_amount: calculateGrandTotal(),
      created_by_user_id: user.id,
    };

    try {
      if (quoteId) {
        await updateQuote(quoteId, quoteData);
        alert('Quote updated successfully!');
      } else {
        const response = await api.post('/quotes/create/', quoteData);
        alert(`Quote saved successfully! Quote ID: ${response.data.quote_id}`);
      }
      router.push('/');
    } catch (err: any) {
      console.error('Failed to save quote:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to save quote.');
    } finally {
      setLoading(false);
    }
  };

  // Add Family Dialog Logic
  const handleOpenAddFamily = () => {
    setSelectedFamiliesToAdd([]);
    setIsAddFamilyOpen(true);
  };

  const toggleFamilySelection = (family: ProductFamilySerializer) => {
    setSelectedFamiliesToAdd(prev =>
      prev.some(f => f.id === family.id)
        ? prev.filter(f => f.id !== family.id)
        : [...prev, family]
    );
  };

  const handleAddSelectedFamilies = async () => {
    setLoadingFamilies(true);
    try {
      await addFamiliesToQuote(selectedFamiliesToAdd);
      setIsAddFamilyOpen(false);
    } catch (e) {
      console.error("Failed to add families", e);
      alert("Failed to add families");
    } finally {
      setLoadingFamilies(false);
    }
  };

  if (isInitializing) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  return (
    <div className="min-h-screen">
      <div className='flex justify-between items-center mb-6'>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{quoteId ? 'Edit Quote' : 'New Quote'}</h1>
        <div className='flex gap-2'>
          <Button onClick={handleOpenAddFamily} variant="outline">
            <Plus className="mr-2 h-4 w-4" /> Add Family
          </Button>
          <Button onClick={handleSaveQuote} disabled={loading} className="bg-green-600 hover:bg-green-700">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {quoteId ? 'Update Quote' : 'Save Quote'}
          </Button>
        </div>
      </div>

      {error && <div className="text-red-500 text-center mb-4">{error}</div>}

      <div>
        <div className="mb-6 bg-white p-4 rounded-lg border shadow-sm relative">
          <label htmlFor="customerName" className="block text-gray-700 text-sm font-bold mb-2">
            Customer Name:
          </label>
          <div className="relative">
            <div className="flex items-center border rounded shadow-sm focus-within:ring-2 focus-within:ring-blue-500 bg-white">
              <Search className="ml-2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                id="customerName"
                autoComplete="off"
                className="w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none bg-transparent"
                value={customerName}
                onChange={handleCustomerSearchChange}
                onFocus={() => setShowSuggestions(true)}
                // Delay setting false to allow click event to register on the item
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="Search by name, email, or phone..."
              />
            </div>

            {showSuggestions && (customerName || filteredCustomers.length > 0) && (
              <div className="absolute z-10 w-full bg-white border rounded mt-1 shadow-lg max-h-60 overflow-y-auto">
                {filteredCustomers.length > 0 ? (
                  filteredCustomers.map(customer => (
                    <div
                      key={customer.id}
                      className="p-2 hover:bg-gray-100 cursor-pointer flex flex-col border-b last:border-0"
                      onClick={() => selectCustomer(customer)}
                    >
                      <span className="font-medium text-gray-900">{customer.name}</span>
                      <div className="flex gap-3 text-xs text-gray-500 mt-1">
                        {customer.email && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {customer.email}</span>}
                        {customer.phone && <span>{customer.phone}</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-2 text-sm text-gray-500 italic">No customers found.</div>
                )}
              </div>
            )}

            {(customerEmail || customerPhone) && (
              <div className="mt-2 text-xs text-gray-500 flex gap-4 bg-gray-50 p-2 rounded border border-gray-100">
                {customerEmail && <span className="font-medium">📧 {customerEmail}</span>}
                {customerPhone && <span className="font-medium">📱 {customerPhone}</span>}
              </div>
            )}
          </div>
        </div>

        {quoteFamilies.length === 0 && (
          <div className='text-center py-20 bg-gray-50 rounded-lg border border-dashed'>
            <p className='text-muted-foreground mb-4'>No products added yet.</p>
            <Button onClick={handleOpenAddFamily}>
              <Plus className="mr-2 h-4 w-4" /> Add Product Family
            </Button>
          </div>
        )}

        {quoteFamilies.map((family, familyIndex) => (
          <div key={`${family.family_id}-${familyIndex}`} className="border rounded-lg bg-white mb-6 shadow-sm overflow-hidden">
            <div className="flex justify-between items-center p-4 bg-gray-50 border-b">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <span className='w-2 h-8 bg-blue-500 rounded-full inline-block'></span>
                {family.family_name}
                <span className='text-sm font-normal text-muted-foreground'>({family.category})</span>
              </h2>
              <div className='flex gap-2'>
                <Button variant="outline" size="sm" onClick={() => handleAddItem(familyIndex)} className="text-green-600 border-green-200 hover:bg-green-50">
                  <CirclePlus className="mr-2 h-4 w-4" /> Add Item
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleRemoveFamily(familyIndex)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100/50">
                  <tr>
                    <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[200px]">Item</th>
                    {customColumns.map(col => (
                      <th key={col.key} scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[120px]">{col.label}</th>
                    ))}
                    <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase w-[100px]">Qty</th>
                    <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase w-[120px]">Price</th>
                    <th scope="col" className="p-3 text-left text-xs font-medium text-gray-500 uppercase w-[100px]">Unit</th>
                    <th scope="col" className="p-3 text-right text-xs font-medium text-gray-500 uppercase w-[120px]">Total</th>
                    <th scope="col" className="p-3 w-[50px]"></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {family.items.map((item, itemIndex) => (
                    <tr key={item.id} className='hover:bg-slate-50 group'>
                      <td className="p-2">
                        <input
                          type="text"
                          className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow"
                          value={item.name}
                          onChange={(e) => handleItemChange(familyIndex, itemIndex, 'name', e.target.value)}
                        />
                      </td>

                      {customColumns.map(col => (
                        <td key={col.key} className="p-2">
                          <input
                            type={col.type === 'number' ? 'number' : 'text'}
                            className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow bg-gray-50/50"
                            value={(item as any)[col.key] || ''}
                            onChange={(e) => handleItemChange(familyIndex, itemIndex, col.key, e.target.value)}
                          />
                        </td>
                      ))}

                      <td className="p-2">
                        <input
                          type="number"
                          className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow text-center"
                          value={item.qty}
                          onChange={(e) => handleItemChange(familyIndex, itemIndex, 'qty', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow text-center"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(familyIndex, itemIndex, 'unit_price', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          className="w-full border rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-shadow text-center"
                          value={item.unit_type}
                          onChange={(e) => handleItemChange(familyIndex, itemIndex, 'unit_type', e.target.value)}
                        />
                      </td>
                      <td className="p-3 text-right text-sm font-medium">
                        {Number(item.total)?.toFixed(2)}
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(familyIndex, itemIndex)}
                          className="text-red-400 hover:text-red-600 opacity-60 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end items-center p-4 bg-slate-50 border-t">
              <span className="text-sm font-medium text-gray-500 mr-4">Family Subtotal:</span>
              <span className="text-lg font-bold text-gray-800">INR {family.subtotal.toFixed(2)}</span>
            </div>
          </div>
        ))}

        {quoteFamilies.length > 0 && (
          <div className="mt-8 flex flex-col items-end gap-2 p-6 bg-white rounded-lg border shadow-sm">
            <div className='flex justify-between w-full md:w-1/3'>
              <span className='text-muted-foreground'>Total Items Cost:</span>
              <span className='font-medium'>INR {calculateGrandTotal().toFixed(2)}</span>
            </div>
            {/* We could add generic tax/discount logic here later */}
            <div className="h-px bg-gray-200 w-full md:w-1/3 my-2"></div>
            <div className='flex justify-between w-full md:w-1/3 text-2xl font-bold'>
              <span>GRAND TOTAL</span>
              <span>INR {calculateGrandTotal().toFixed(2)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Add Family Sheet (Drawer) */}
      <Sheet open={isAddFamilyOpen} onOpenChange={setIsAddFamilyOpen}>
        <SheetContent side="left" title="Add Product Families" className="w-full sm:w-[540px] flex flex-col h-full">
          <SheetHeader>
            <SheetTitle>Add Product Families</SheetTitle>
            <SheetDescription>
              Select product families to add to your quote. All items in the selected families will be added.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto py-4">
            <div className="space-y-4">
              {allFamilies.map((family) => (
                <div
                  key={family.id}
                  className={`
                            relative border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md
                            ${selectedFamiliesToAdd.some(f => f.id === family.id) ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'bg-white border-gray-200'}
                        `}
                  onClick={() => toggleFamilySelection(family)}
                >
                  <div className="absolute top-3 right-3">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={selectedFamiliesToAdd.some(f => f.id === family.id)}
                      onChange={() => toggleFamilySelection(family)}
                    />
                  </div>
                  <h3 className="font-semibold text-lg">{family.name}</h3>
                  <p className="text-sm text-muted-foreground">{family.description}</p>
                  <div className="mt-2 text-xs bg-gray-100 inline-block px-2 py-1 rounded">
                    Margin: {(family.base_margin * 100).toFixed(0)}%
                  </div>

                  {/* Products List within Family Card */}
                  <div className="mt-4 pt-3 border-t">
                    <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Included Products</p>
                    <div className="bg-gray-50 rounded p-2 text-sm space-y-1">
                      {familyProductsMap[family.id] ? (
                        familyProductsMap[family.id].length > 0 ? (
                          familyProductsMap[family.id].map((product: any, idx: number) => (
                            <div key={product.id || idx} className="flex justify-between items-center text-xs text-gray-700 p-1 hover:bg-gray-100 rounded">
                              <span>{product.name}</span>
                              <span className="font-medium text-gray-500">INR {product.price}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground italic">No products in this family.</p>
                        )
                      ) : (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Loading products...
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <SheetFooter className="mt-auto border-t pt-4">
            <Button variant="outline" onClick={() => setIsAddFamilyOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSelectedFamilies} disabled={selectedFamiliesToAdd.length === 0 || loadingFamilies}>
              {loadingFamilies ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Add {selectedFamiliesToAdd.length} Families
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
};

const QuoteEditorPage: React.FC = () => {
  return (
    <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>}>
      <QuoteEditorContent />
    </Suspense>
  );
};

export default QuoteEditorPage;
