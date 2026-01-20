'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api, { useAuthStore } from '@/lib/api/client';
import { QuoteFamily, QuoteItem } from '@/lib/types';
import { getProductsByFamily } from '@/lib/api/products';
import { getQuote, updateQuote } from '@/lib/api/quotes';
import { CirclePlus, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

const QuoteEditorContent: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('id');
  const { user, selectedProductFamilies } = useAuthStore();
  const [quoteFamilies, setQuoteFamilies] = useState<QuoteFamily[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initialize = async () => {
      setIsInitializing(true);
      try {
        if (quoteId) {
          // Editing existing quote
          const quote = await getQuote(quoteId);
          const details = quote.snapshot as any || quote;
          setCustomerName(details.customer_name);
          setQuoteFamilies(details.families || []);
        } else if (selectedProductFamilies.length > 0) {
          // Creating new quote from selection
          const familiesWithProducts = await Promise.all(
            selectedProductFamilies.map(async (family) => {
              const products = await getProductsByFamily(family);
              const items: QuoteItem[] = products.map(product => ({
                id: product.id,
                name: product.name,
                qty: 1,
                unit_price: product.price,
                unit_type: 'unit',
                total: product.price,
              }));

              const subtotal = items.reduce((acc, item) => acc + (item.qty * item.unit_price), 0);

              return {
                family_id: family.id,
                family_name: family.name,
                category: family.category,
                items: items,
                subtotal: subtotal,
                margin_applied: family.base_margin || 0,
              };
            })
          );
          setQuoteFamilies(familiesWithProducts);
        } else {
          // No selection and no ID, redirect to new
          // router.push('/quotes/new');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to initialize quote editor.');
      } finally {
        setIsInitializing(false);
      }
    };

    initialize();
  }, [quoteId, selectedProductFamilies, router]);

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
  }, [JSON.stringify(quoteFamilies.map(f => f.items))]); // Deep dependency check simplifed


  const handleItemChange = (familyIndex: number, itemIndex: number, field: string, value: any) => {
    setQuoteFamilies(prevFamilies =>
      prevFamilies.map((family, fIdx) => {
        if (fIdx !== familyIndex) return family;
        const newItems = [...family.items];
        const newItem = { ...newItems[itemIndex], [field]: value };
        newItem.total = newItem.qty * newItem.unit_price;
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

  if (isInitializing) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>
  }

  return (
    <div className="min-h-screen">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-6">{quoteId ? 'Edit Quote' : 'New Quote'}</h1>

      {error && <div className="text-red-500 text-center mb-4">{error}</div>}

      <div className="w-full md:max-w-4xl mx-auto">
        <div className="mb-4">
          <label htmlFor="customerName" className="block text-gray-700 text-sm font-bold mb-2">
            Customer Name:
          </label>
          <input
            type="text"
            id="customerName"
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Enter customer name"
          />
        </div>
        {quoteFamilies.map((family, familyIndex) => (
          <div key={`${family.family_id}-${familyIndex}`} className="border-t bg-white relative">
            <div className="flex justify-between items-start md:items-center p-2">
              <h2 className="w-full text-xl md:text-2xl font-semibold text-gray-800">{family.family_name} ({family.category})</h2>
              <Button variant="ghost" onClick={() => handleRemoveFamily(familyIndex)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                <Trash2 />
                <span className='sr-only'>Remove Family</span>
              </Button>
              <Button variant="ghost" onClick={() => handleAddItem(familyIndex)} className="text-green-500 hover:text-green-700 hover:bg-green-50"
                type="button"
              >
                <CirclePlus />
                <span className='sr-only'>Add Custom Item</span>
              </Button>
            </div>
            <div className="overflow-x-scroll"
              style={{
                width: "calc(100vw - (var(--spacing) * 8))"
              }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="p-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[100px]">Item</th>
                    <th scope="col" className="p-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[36px]">Qty</th>
                    <th scope="col" className="p-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[80px]">Price</th>
                    <th scope="col" className="p-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[40px]">Unit Type</th>
                    <th scope="col" className="p-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[80px] sticky right-[36px] bg-gray-100 z-10">Total</th>
                    <th scope="col" className="relative p-2 md:px-6 md:py-3 min-w-[36px] sticky right-0 bg-gray-100 z-10"><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {family.items.map((item, itemIndex) => (
                    <tr key={item.id}>
                      <td className="border md:px-6 md:py-4 whitespace-nowrap">
                        <input
                          type="text"
                          className="w-full border-0 px-2 py-1 text-xs focus:ring-primary focus:border-primary"
                          value={item.name}
                          onChange={(e) => handleItemChange(familyIndex, itemIndex, 'name', e.target.value)}
                        />
                      </td>
                      <td className="border md:px-6 md:py-4 whitespace-nowrap">
                        <input
                          type="number"
                          className="w-full border-0 px-2 py-1 text-xs focus:ring-primary focus:border-primary"
                          value={item.qty}
                          onChange={(e) => handleItemChange(familyIndex, itemIndex, 'qty', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="border md:px-6 md:py-4 whitespace-nowrap">
                        <input
                          type="number"
                          step="0.01"
                          className="w-full border-0 px-2 py-1 text-xs focus:ring-primary focus:border-primary"
                          value={item.unit_price}
                          onChange={(e) => handleItemChange(familyIndex, itemIndex, 'unit_price', parseFloat(e.target.value))}
                        />
                      </td>
                      <td className="border md:px-6 md:py-4 whitespace-nowrap">
                        <input
                          type="text"
                          className="w-full border-0 px-2 py-1 text-xs focus:ring-primary focus:border-primary"
                          value={item.unit_type}
                          onChange={(e) => handleItemChange(familyIndex, itemIndex, 'unit_type', e.target.value)}
                        />
                      </td>
                      <td className="md:px-6 md:py-4 whitespace-nowrap text-right text-xs min-w-[80px] sticky right-[36px] bg-gray-100 z-10">{Number(item.total)?.toFixed(2)}</td>
                      <td className="md:px-6 md:py-4 whitespace-nowrap text-right text-xs font-medium min-w-[36px] sticky right-0 bg-gray-100 z-10">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(familyIndex, itemIndex)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center p-2">
              <span className="font-bold">Subtotal:</span>
              <span className="font-bold">{family.subtotal.toFixed(2)}</span>
            </div>
          </div>
        ))}
        <div className="mt-8 pt-4 border-t-2 border-gray-200 flex flex-col md:flex-row justify-between items-center gap-4 pb-20 md:pb-0">
          <h3 className="text-2xl font-bold text-gray-800">Grand Total: INR {calculateGrandTotal().toFixed(2)}</h3>
          <button
            onClick={handleSaveQuote}
            disabled={loading}
            className="w-full md:w-auto px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md text-lg disabled:opacity-50"
          >
            {loading ? 'Saving...' : (quoteId ? 'Update Quote' : 'Save Quote')}
          </button>
        </div>
      </div>
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
