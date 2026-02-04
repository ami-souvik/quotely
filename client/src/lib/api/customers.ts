import api from './client';
import { Customer } from '@/lib/types';

export const getCustomers = async (): Promise<Customer[]> => {
  const response = await api.get('/quotes/customers/');
  return response.data;
};

export const getCustomer = async (id: string): Promise<Customer> => {
  const response = await api.get(`/quotes/customers/${id}/`);
  return response.data;
};

export const createCustomer = async (data: Partial<Customer>): Promise<Customer> => {
  const response = await api.post('/quotes/customers/', data);
  return response.data;
};

export const updateCustomer = async (id: string, data: Partial<Customer>): Promise<Customer> => {
  const response = await api.put(`/quotes/customers/${id}/`, data);
  return response.data;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await api.delete(`/quotes/customers/${id}/`);
};
