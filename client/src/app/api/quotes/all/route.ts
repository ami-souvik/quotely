import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth-server';
import { services } from '@/lib/services';

export async function GET(req: NextRequest) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const quotes = await services.getOrganizationQuotations(user.org_id);
    // Add id to items if missing (usually handled by service mapping but getUserQuotations returns Items)
    // Actually the service just returns Items.
    // The Frontend expects `id` (or uses SK).
    // Let's ensure we map it.
    const mapped = quotes.map(q => ({
        ...q,
        id: q.SK.split('#')[1]
    }));
    return NextResponse.json(mapped);
}
