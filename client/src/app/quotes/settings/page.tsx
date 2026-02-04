'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Save, Building, Phone, Mail, Globe, Image as ImageIcon } from 'lucide-react';
import api from '@/lib/api/client';
import { toast } from 'sonner';

const SettingsPage = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [orgData, setOrgData] = useState({
        name: '',
        logo_url: '',
        contact_number: '',
        email: '',
        address: ''
    });

    useEffect(() => {
        const fetchOrg = async () => {
            try {
                const response = await api.get('/org');
                setOrgData({
                    name: response.data.name || '',
                    logo_url: response.data.logo_url || '',
                    contact_number: response.data.contact_number || '',
                    email: response.data.email || '',
                    address: response.data.address || ''
                });
            } catch (error) {
                console.error('Failed to fetch org settings:', error);
                toast.error('Failed to load organization settings');
            } finally {
                setLoading(false);
            }
        };
        fetchOrg();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await api.put('/org', orgData);
            toast.success('Settings updated successfully');
        } catch (error) {
            console.error('Failed to update org settings:', error);
            toast.error('Failed to update settings');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your organization profile and public contact information.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Organization Profile</CardTitle>
                    <CardDescription>
                        This information will appear on all generated PDF quotations.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="flex items-center gap-2">
                                <Building className="h-4 w-4" /> Organization Name
                            </Label>
                            <Input
                                id="name"
                                value={orgData.name}
                                onChange={(e) => setOrgData({ ...orgData, name: e.target.value })}
                                placeholder="e.g. Acme Interiors"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="logo" className="flex items-center gap-2">
                                <ImageIcon className="h-4 w-4" /> Logo URL
                            </Label>
                            <Input
                                id="logo"
                                value={orgData.logo_url}
                                onChange={(e) => setOrgData({ ...orgData, logo_url: e.target.value })}
                                placeholder="https://example.com/logo.png"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="flex items-center gap-2">
                                <Mail className="h-4 w-4" /> Business Email
                            </Label>
                            <Input
                                id="email"
                                type="email"
                                value={orgData.email}
                                onChange={(e) => setOrgData({ ...orgData, email: e.target.value })}
                                placeholder="contact@company.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone" className="flex items-center gap-2">
                                <Phone className="h-4 w-4" /> Contact Number
                            </Label>
                            <Input
                                id="phone"
                                value={orgData.contact_number}
                                onChange={(e) => setOrgData({ ...orgData, contact_number: e.target.value })}
                                placeholder="+91 98765 43210"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                            id="address"
                            value={orgData.address}
                            onChange={(e) => setOrgData({ ...orgData, address: e.target.value })}
                            placeholder="Full business address"
                        />
                    </div>

                    {orgData.logo_url && (
                        <div className="pt-4">
                            <Label className="text-xs text-muted-foreground uppercase mb-2 block">Logo Preview</Label>
                            <div className="p-4 border rounded-lg bg-slate-50 flex items-center justify-center">
                                <img
                                    src={orgData.logo_url}
                                    alt="Logo Preview"
                                    className="max-h-20 object-contain"
                                    onError={(e) => e.currentTarget.src = 'https://via.placeholder.com/150?text=Invalid+Logo+URL'}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-end border-t px-6 py-4">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Changes
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
};

export default SettingsPage;
