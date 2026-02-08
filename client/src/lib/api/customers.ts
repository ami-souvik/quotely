import axios from 'axios';
import { Customer } from '@/lib/types';

export const getCustomers = async (): Promise<Customer[]> => {
  const response = await axios.get('/api/quotes/customers/');
  return response.data;
};

export const getCustomer = async (id: string): Promise<Customer> => {
  const response = await axios.get(`/api/quotes/customers/${id}/`);
  return response.data;
};

export const createCustomer = async (data: Partial<Customer>): Promise<Customer> => {
  const response = await axios.post('/api/quotes/customers/', data);
  return response.data;
};

export const updateCustomer = async (id: string, data: Partial<Customer>): Promise<Customer> => {
  const response = await axios.put(`/api/quotes/customers/${id}/`, data);
  return response.data;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await axios.delete(`/api/quotes/customers/${id}/`);
};
