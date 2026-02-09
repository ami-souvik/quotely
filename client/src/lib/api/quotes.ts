import axios from 'axios';
import { Quote } from '@/lib/types';
export type { Quote };

export const getQuotes = async (): Promise<Quote[]> => {
  const response = await axios.get('/api/quotes/all/');
  return response.data;
};

export const createQuote = async (data: any): Promise<{ id: string }> => {
  const response = await axios.post('/api/quotes/', data);
  return response.data;
};

export const getQuote = async (id: string): Promise<Quote> => {
  const response = await axios.get(`/api/quotes/${id}/`); 
  return response.data;
};

export const updateQuote = async (id: string, data: any): Promise<Quote> => {
  const response = await axios.put(`/api/quotes/${id}/`, data);
  return response.data;
};

export const deleteQuote = async (id: string): Promise<void> => {
  await axios.delete(`/api/quotes/${id}/`);
};

export const generatePdf = async (id: string, templateId?: string): Promise<void> => {
  await axios.post(`/api/quotes/${id}/generate-pdf/`, { template_id: templateId });
};

export const getPresignedUrl = async (id: string, download = false): Promise<string> => {
  const response = await axios.get(`/api/quotes/${id}/presigned-url/${download ? '?download=true' : ''}`);
  return response.data.presigned_url;
};

export const getTemplateSettings = async (): Promise<any[]> => {
  const response = await axios.get('/api/quotes/templates/settings/');
  return response.data.columns || [];
};

export const updateTemplateSettings = async (columns: any[]): Promise<any[]> => {
  const response = await axios.post('/api/quotes/templates/settings/', { columns });
  return response.data.columns;
};

// Templates
export interface Template {
  id: string;
  name: string;
  columns: any[];
  created_at?: string;
}

export const getTemplates = async (): Promise<Template[]> => {
  const response = await axios.get('/api/quotes/pdf-templates/');
  return response.data;
};

export const getTemplate = async (id: string): Promise<Template> => {
  const response = await axios.get(`/api/quotes/pdf-templates/${id}/`);
  return response.data;
};

export const createTemplate = async (data: Partial<Template>): Promise<Template> => {
  const response = await axios.post('/api/quotes/pdf-templates/', data);
  return response.data;
};

export const updateTemplate = async (id: string, data: Partial<Template>): Promise<Template> => {
  const response = await axios.put(`/api/quotes/pdf-templates/${id}/`, data);
  return response.data;
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await axios.delete(`/api/quotes/pdf-templates/${id}/`);
};
