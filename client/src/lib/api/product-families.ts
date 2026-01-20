import api from './client';
import { ProductFamilySerializer } from '../types';

export const getProductFamilies = async (): Promise<ProductFamilySerializer[]> => {
  const response = await api.get('/quotes/families/');
  return response.data;
};

export const createProductFamily = async (data: Omit<ProductFamilySerializer, 'id'>): Promise<ProductFamilySerializer> => {
  const response = await api.post('/quotes/families/', data);
  return response.data;
};

export const updateProductFamily = async ({ id, category }: { id: string, category: string },
  data: ProductFamilySerializer): Promise<ProductFamilySerializer> => {
  const response = await api.put(`/quotes/families/${category}/${id}/`, data);
  return response.data;
};

export const deleteProductFamily = async (id: string): Promise<void> => {
  await api.delete(`/quotes/families/${id}/`);
};
