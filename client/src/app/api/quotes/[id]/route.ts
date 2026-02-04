import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth-server';
import { services } from '@/lib/services';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const quote = await services.getQuotation(user.org_id, id);
    if (!quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    
    // Add ID
    const mapped = { ...quote, id: quote.SK.split('#')[1] };
    return NextResponse.json(mapped);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const { id } = await params;
        const data = await req.json();
        const updated = await services.updateQuotation(user.org_id, id, data);
        return NextResponse.json(updated);
    } catch (e) {
        return NextResponse.json({ error: 'Error updating' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
     const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const success = await services.deleteQuotation(user.org_id, id);
    if (success) return NextResponse.json({ success: true });
    return NextResponse.json({ error: 'Error deleting' }, { status: 500 });
}
