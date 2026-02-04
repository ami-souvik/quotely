import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth-server';
import { services } from '@/lib/services';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const success = await services.deleteProductFamily(user.org_id, id);
    if (success) return NextResponse.json({ success: true });
    return NextResponse.json({ error: 'Error deleting family' }, { status: 500 });
}
