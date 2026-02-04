import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth-server';
import { services } from '@/lib/services';

export async function GET(req: NextRequest) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const families = await services.getProductFamilies(user.org_id);
    return NextResponse.json(families);
}

export async function POST(req: NextRequest) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const data = await req.json();
        const family = await services.createProductFamily(user.org_id, data);
        return NextResponse.json(family, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: 'Error creating family' }, { status: 500 });
    }
}
