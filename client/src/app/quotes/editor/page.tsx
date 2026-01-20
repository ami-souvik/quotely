'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import api, { useAuthStore } from '@/lib/api/client';
import { QuoteFamily, QuoteItem, ProductFamilySerializer, Product } from '@/lib/types';
import { getProductsByFamily } from '@/lib/api/products';

const QuoteEditorPage: React.FC = () => {
  const router = useRouter();
  const { user, selectedProductFamilies } = useAuthStore(); // Get selected families from store
  const [quoteFamilies, setQuoteFamilies] = useState<QuoteFamily[]>([]);
  const [customerName, setCustomerName] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeQuote = async () => {
      if (selectedProductFamilies.length > 0) {
        setLoading(true);
        try {
          const familiesWithProducts = await Promise.all(
            selectedProductFamilies.map(async (family) => {
              const products = await getProductsByFamily(family);
              const items: QuoteItem[] = products.map(product => ({
                id: product.id,
                name: product.name,
                qty: 1, // Default quantity
                unit_price: product.price,
                unit_type: 'unit', // Or some default/derived value
                total: product.price, // Initial total
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
        } catch (err) {
          setError('Failed to load products for families.');
          console.error(err);
        } finally {
          setLoading(false);
        }
      } else {
        router.push('/quotes/new');
      }
    };

    initializeQuote();
  }, [selectedProductFamilies, router]);

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
      grandTotal += subtotal * (1 + family.margin_applied); // Apply margin
    });
    // Add tax later if needed
    return grandTotal;
  }, [quoteFamilies, calculateFamilySubtotal]);

  useEffect(() => {
    // Recalculate subtotals when quoteFamilies change
    // setQuoteFamilies(prevFamilies => prevFamilies.map(family => ({
    //   ...family,
    //   subtotal: calculateFamilySubtotal(family)
    // })));
  }, [quoteFamilies, calculateFamilySubtotal]);


  const handleItemChange = (familyIndex: number, itemIndex: number, field: string, value: any) => {
    setQuoteFamilies(prevFamilies => {
      const newFamilies = [...prevFamilies];
      const newItem = { ...newFamilies[familyIndex].items[itemIndex], [field]: value };
      newItem.total = newItem.qty * newItem.unit_price; // Recalculate item total
      newFamilies[familyIndex].items[itemIndex] = newItem;
      return newFamilies;
    });
  };

  const handleAddItem = (familyIndex: number) => {
    setQuoteFamilies(prevFamilies => {
      const newFamilies = [...prevFamilies];
      const newItem: QuoteItem = {
        id: String(Math.random()),
        name: 'New Custom Item',
        qty: 1,
        unit_price: 0,
        unit_type: 'unit',
        total: 0,
      };
      newFamilies[familyIndex].items.push(newItem);
      return newFamilies;
    });
  };

  const handleRemoveItem = (familyIndex: number, itemIndex: number) => {
    setQuoteFamilies(prevFamilies => {
      const newFamilies = [...prevFamilies];
      newFamilies[familyIndex].items.splice(itemIndex, 1);
      return newFamilies;
    });
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
      created_by_user_id: user.username, // Pass username as user ID
    };

    try {
      const response = await api.post('/quotes/create/', quoteData);
      alert(`Quote saved successfully! Quote ID: ${response.data.quote_id}`);
      router.push('/'); // Go back to dashboard
    } catch (err: any) {
      console.error('Failed to save quote:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to save quote.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Quote Editor</h1>

      {error && <div className="text-red-500 text-center mb-4">{error}</div>}

      <div className="max-w-4xl mx-auto">
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
          <div key={family.family_id} className="mb-4">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">{family.family_name} ({family.category})</h2>

            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th scope="col" className="relative px-6 py-3"><span className="sr-only">Edit</span></th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {family.items.map((item, itemIndex) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        className="w-full border-none focus:ring-0"
                        value={item.name}
                        onChange={(e) => handleItemChange(familyIndex, itemIndex, 'name', e.target.value)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        className="w-20 border-none focus:ring-0"
                        value={item.qty}
                        onChange={(e) => handleItemChange(familyIndex, itemIndex, 'qty', parseFloat(e.target.value))}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="number"
                        step="0.01"
                        className="w-24 border-none focus:ring-0"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(familyIndex, itemIndex, 'unit_price', parseFloat(e.target.value))}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="text"
                        className="w-24 border-none focus:ring-0"
                        value={item.unit_type}
                        onChange={(e) => handleItemChange(familyIndex, itemIndex, 'unit_type', e.target.value)}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">INR {Number(item.total)?.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRemoveItem(familyIndex, itemIndex)}
                        className="text-red-600 hover:text-red-900 ml-4"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 flex justify-between items-center">
              <button
                onClick={() => handleAddItem(familyIndex)}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Add Custom Item
              </button>
              <span className="text-lg font-bold">Family Subtotal: INR {family.subtotal.toFixed(2)}</span>
            </div>
          </div>
        ))}

        <div className="mt-8 pt-4 border-t-2 border-gray-200 flex justify-between items-center">
          <h3 className="text-2xl font-bold text-gray-800">Grand Total: INR {calculateGrandTotal().toFixed(2)}</h3>
          <button
            onClick={handleSaveQuote}
            disabled={loading}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md text-lg disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Quote'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuoteEditorPage;