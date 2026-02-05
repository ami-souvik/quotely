
import api from './client';

export interface Organization {
    id: string;
    name: string;
    logo_url?: string;
    contact_number?: string;
    email?: string;
    address?: string;
}

export const getOrganization = async (): Promise<Organization> => {
    const response = await api.get('/org');
    return response.data;
};

export const updateOrganization = async (data: Partial<Organization>): Promise<Organization> => {
    const response = await api.put('/org', data);
    return response.data;
};
