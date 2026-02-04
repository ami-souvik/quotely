import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth-server';
import { services } from '@/lib/services';

export async function GET(req: NextRequest) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const columns = await services.getTemplateSettings(user.org_id);
    return NextResponse.json({ columns });
}

export async function POST(req: NextRequest) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const columns = body.columns || [];
        await services.updateTemplateSettings(user.org_id, columns);
        return NextResponse.json({ columns });
    } catch (e) {
        return NextResponse.json({ error: 'Error updating settings' }, { status: 500 });
    }
}
