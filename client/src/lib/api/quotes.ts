import api from './client';

export interface Quote {
  PK: string;
  SK: string;
  status: string;
  customer_name: string;
  total_amount: number;
  created_at: string;
  s3_pdf_link?: string;
  snapshot?: any;
  items?: any[]; // Adjust type as needed based on backend response
  families?: any[];
}

export const getQuotes = async (): Promise<Quote[]> => {
  const response = await api.get('/quotes/mine/');
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

export const generatePdf = async (id: string): Promise<void> => {
  await api.post(`/quotes/${id}/generate-pdf/`);
};

export const getPresignedUrl = async (id: string): Promise<string> => {
  const response = await api.get(`/quotes/${id}/presigned-url/`);
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
