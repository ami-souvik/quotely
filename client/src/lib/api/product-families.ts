import axios from 'axios';
import { ProductFamilySerializer } from '../types';

export const getProductFamilies = async (): Promise<ProductFamilySerializer[]> => {
  const response = await axios.get('/api/quotes/families/');
  return response.data;
};

export const createProductFamily = async (data: Omit<ProductFamilySerializer, 'id'>): Promise<ProductFamilySerializer> => {
  const response = await axios.post('/api/quotes/families/', data);
  return response.data;
};

export const updateProductFamily = async (id: string, data: ProductFamilySerializer): Promise<ProductFamilySerializer> => {
  const response = await axios.put(`/api/quotes/families/${id}/`, data);
  return response.data;
};

export const deleteProductFamily = async (id: string): Promise<void> => {
  await axios.delete(`/api/quotes/families/${id}/`);
};
