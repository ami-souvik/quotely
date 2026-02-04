import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth-server';
import { services } from '@/lib/services';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: familyId } = await params;
    
    try {
        const products = await services.getProductsByFamily(user.org_id, familyId);
        return NextResponse.json(products);
    } catch (e) {
        console.error('Error in products by family route:', e);
        return NextResponse.json({ error: 'Failed to fetch products for the family' }, { status: 500 });
    }
}
