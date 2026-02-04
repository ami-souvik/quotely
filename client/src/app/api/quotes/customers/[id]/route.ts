import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth-server';
import { services } from '@/lib/services';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const customer = await services.getCustomer(user.org_id, id);
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  
  return NextResponse.json(customer);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    const data = await req.json();
    const updated = await services.updateCustomer(user.org_id, id, data);
    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await authenticate(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const success = await services.deleteCustomer(user.org_id, id);
  if (success) return NextResponse.json({ success: true });
  return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
}
