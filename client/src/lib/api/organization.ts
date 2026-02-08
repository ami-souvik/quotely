
import axios from 'axios';

export interface Organization {
    id: string;
    name: string;
    logo_url?: string;
    contact_number?: string;
    email?: string;
    address?: string;
}

export const getOrganization = async (): Promise<Organization> => {
    const response = await axios.get('/api/org');
    return response.data;
};

export const updateOrganization = async (data: Partial<Organization>): Promise<Organization> => {
    const response = await axios.put('/api/org', data);
    return response.data;
};
