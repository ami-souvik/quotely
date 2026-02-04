import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth-server';
import { services } from '@/lib/services';

export async function POST(req: NextRequest) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const data = await req.json();
        // Quote creation logic
        // We might want to separate creation from validation but service handles basics.
        const id = await services.createQuotation(user.org_id, user.id, data);
        if (id) {
            return NextResponse.json({ id }, { status: 201 });
        }
        return NextResponse.json({ error: 'Failed' }, { status: 500 });
    } catch (e) {
        return NextResponse.json({ error: 'Error' }, { status: 500 });
    }
}
