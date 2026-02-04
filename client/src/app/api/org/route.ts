import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth-server';
import { services } from '@/lib/services';

export async function GET(req: NextRequest) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const organization = await services.getOrganization(user.org_id);
        if (!organization) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        return NextResponse.json(organization);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to fetch organization' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const data = await req.json();
        const updated = await services.updateOrganization(user.org_id, data);
        if (!updated) return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
        return NextResponse.json(updated);
    } catch (e) {
        return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
    }
}
