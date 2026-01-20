'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api, { useAuthStore } from '@/lib/api/client';
import { ProductFamilySerializer } from '@/lib/types';

const NewQuotePage: React.FC = () => {
  const router = useRouter();
  const [productFamilies, setProductFamilies] = useState<ProductFamilySerializer[]>([]);
  const [selectedFamilies, setSelectedFamilies] = useState<ProductFamilySerializer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setProductFamiliesForQuote } = useAuthStore(); // Access the setter from store

  useEffect(() => {
    const fetchProductFamilies = async () => {
      try {
        const response = await api.get('/quotes/families/');
        setProductFamilies(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Failed to fetch product families.');
      } finally {
        setLoading(false);
      }
    };
    fetchProductFamilies();
  }, []);

  const handleFamilySelect = (family: ProductFamilySerializer) => {
    setSelectedFamilies((prevSelected) =>
      prevSelected.some((f) => f.id === family.id)
        ? prevSelected.filter((f) => f.id !== family.id)
        : [...prevSelected, family]
    );
  };

  const handleNext = () => {
    if (selectedFamilies.length === 0) {
      alert('Please select at least one product family.');
      return;
    }
    setProductFamiliesForQuote(selectedFamilies); // Save selected families to Zustand store
    router.push('/quotes/editor'); // Navigate to quote editor
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen">Loading families...</div>;
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-500">{error}</div>;

  return (
    <div className="min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Select Product Families</h1>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
        {productFamilies.map((family) => (
          <div
            key={family.id}
            className={`bg-white p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow
              ${selectedFamilies.some((f) => f.id === family.id) ? 'border-2 border-blue-500' : 'border border-gray-200'}`}
            onClick={() => handleFamilySelect(family)}
          >
            <h2 className="text-xl font-semibold text-gray-700">{family.name}</h2>
            <p className="text-gray-500">Category: {family.category}</p>
            <p className="text-gray-500 text-sm">Margin: {family.base_margin}%</p>
          </div>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <button
          onClick={handleNext}
          className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md text-lg"
        >
          Next: Go to Quote Editor
        </button>
      </div>
    </div>
  );
};

export default NewQuotePage;