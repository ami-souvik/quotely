import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth-server';
import { services } from '@/lib/services';

export async function GET(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const customers = await services.getCustomers(user.org_id);
  return NextResponse.json(customers);
}

export async function POST(req: NextRequest) {
  const user = await authenticate(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await req.json();
    const customer = await services.createCustomer(user.org_id, data);
    return NextResponse.json(customer, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
