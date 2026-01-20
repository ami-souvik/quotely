import api from './client';
import { Product } from '../types';

export const getProducts = async (): Promise<Product[]> => {
    const response = await api.get('/quotes/products/');
    return response.data;
};

export const createProduct = async (data: Omit<Product, 'id'>): Promise<Product> => {
    const response = await api.post('/quotes/products/', data);
    return response.data;
};

export const updateProduct = async (id: string, data: Partial<Product>): Promise<Product> => {
    const response = await api.put(`/quotes/products/${id}/`, data);
    return response.data;
};

export const deleteProduct = async (id: string): Promise<void> => {
    await api.delete(`/quotes/products/${id}/`);
};

export const getProductsByFamily = async (family: { category: string; id: string }): Promise<Product[]> => {
    const response = await api.get(`/quotes/families/${family.category}/${family.id}/products/`);
    return response.data;
};
