import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth-server';
import { services } from '@/lib/services';

export async function GET(req: NextRequest) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const templates = await services.getTemplates(user.org_id);
    return NextResponse.json(templates);
}

export async function POST(req: NextRequest) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const data = await req.json();
        const template = await services.createTemplate(user.org_id, data);
        return NextResponse.json(template, { status: 201 });
    } catch (e) {
        return NextResponse.json({ error: 'Error creating template' }, { status: 500 });
    }
}
