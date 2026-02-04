import api from './client';
import { Quote } from '@/lib/types';
export type { Quote };

export const getQuotes = async (): Promise<Quote[]> => {
  const response = await api.get('/quotes/all/');
  return response.data;
};

export const createQuote = async (data: any): Promise<{ id: string }> => {
  const response = await api.post('/quotes/', data);
  return response.data;
};

export const getQuote = async (id: string): Promise<Quote> => {
  // Assuming the backend supports getting a single quote by ID. 
  // The ID is likely the SK (sort key) or a dedicated ID field. 
  // Based on the `Quote` interface in page.tsx, the quote seems to have PK and SK.
  // Using SK as the ID for now as it seems to be the unique identifier exposed.
  // We might need to encode it if it contains special characters.
  const response = await api.get(`/quotes/${id}/`); 
  return response.data;
};

export const updateQuote = async (id: string, data: any): Promise<Quote> => {
  const response = await api.put(`/quotes/${id}/`, data);
  return response.data;
};

export const deleteQuote = async (id: string): Promise<void> => {
  await api.delete(`/quotes/${id}/`);
};

export const generatePdf = async (id: string, templateId?: string): Promise<void> => {
  await api.post(`/quotes/${id}/generate-pdf/`, { template_id: templateId });
};

export const getPresignedUrl = async (id: string, download = false): Promise<string> => {
  const response = await api.get(`/quotes/${id}/presigned-url/${download ? '?download=true' : ''}`);
  return response.data.presigned_url;
};

export const getTemplateSettings = async (): Promise<any[]> => {
  const response = await api.get('/quotes/templates/settings/');
  return response.data.columns || [];
};

export const updateTemplateSettings = async (columns: any[]): Promise<any[]> => {
  const response = await api.post('/quotes/templates/settings/', { columns });
  return response.data.columns;
};

// PDF Templates
export interface PDFTemplate {
  id: string;
  name: string;
  columns: any[];
  created_at?: string;
}

export const getPDFTemplates = async (): Promise<PDFTemplate[]> => {
  const response = await api.get('/quotes/pdf-templates/');
  return response.data;
};

export const getPDFTemplate = async (id: string): Promise<PDFTemplate> => {
  const response = await api.get(`/quotes/pdf-templates/${id}/`);
  return response.data;
};

export const createPDFTemplate = async (data: Partial<PDFTemplate>): Promise<PDFTemplate> => {
  const response = await api.post('/quotes/pdf-templates/', data);
  return response.data;
};

export const updatePDFTemplate = async (id: string, data: Partial<PDFTemplate>): Promise<PDFTemplate> => {
  const response = await api.put(`/quotes/pdf-templates/${id}/`, data);
  return response.data;
};

export const deletePDFTemplate = async (id: string): Promise<void> => {
  await api.delete(`/quotes/pdf-templates/${id}/`);
};
