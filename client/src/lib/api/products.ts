import api from './client';
import { Product, ProductColumn } from '../types';

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

export const getProductsByFamily = async (family: { id: string }): Promise<Product[]> => {
    const response = await api.get(`/quotes/families/${family.id}/products/`);
    return response.data;
};

export const getProductSettings = async (): Promise<ProductColumn[]> => {
    const response = await api.get('/quotes/products/settings/');
    return response.data.columns;
};

export const updateProductSettings = async (columns: ProductColumn[]): Promise<ProductColumn[]> => {
    const response = await api.post('/quotes/products/settings/', { columns });
    return response.data.columns;
};
