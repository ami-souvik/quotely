import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth-server';
import { services } from '@/lib/services';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: quoteId } = await params;
    const download = req.nextUrl.searchParams.get('download') === 'true';

    // Check if quote exists/belongs to org?
    // We can just try to generate URL.
    const url = await services.getPresignedS3Url(user.org_id, quoteId, 3600, download);
    if (url) {
        return NextResponse.json({ presigned_url: url });
    }
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
}
