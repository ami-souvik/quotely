import { NextRequest, NextResponse } from 'next/server';
import { generateQuotePdfHtml } from '@/lib/pdf-generator';

export async function GET(req: NextRequest) {
    const dummyQuote = {
        SK: 'QUOTE#DUMMY-123',
        customer_name: 'John Doe',
        customer_email: 'john.doe@example.com',
        created_at: new Date().toISOString(),
        total_amount: 1770.00,
        families: [
            {
                family_name: 'Living Room Furniture',
                items: [
                    { name: 'Modular Sofa Set', qty: 1, unit_price: 850.00, unit_type: 'set', total: 850.00 },
                    { name: 'Teak Wood Coffee Table', qty: 1, unit_price: 320.00, unit_type: 'pcs', total: 320.00 },
                    { name: 'Decorative Floor Lamp', qty: 2, unit_price: 45.00, unit_type: 'pcs', total: 90.00 }
                ],
                subtotal: 1260.00,
                margin_applied: 0.15
            },
            {
                family_name: 'Dining Essentials',
                items: [
                    { name: '6-Seater Dining Table', qty: 1, unit_price: 450.00, unit_type: 'set', total: 450.00 },
                    { name: 'Upholstered Chairs', qty: 6, unit_price: 80.00, unit_type: 'pcs', total: 480.00 }
                ],
                subtotal: 930.00,
                margin_applied: 0.0
            }
        ]
    };

    const dummyOrg = {
        name: 'Quotely Premium Interiors',
        logo_url: 'https://www.reflectyourvibe.in/images/favicon.svg',
        contact_number: '+91 99999 88888',
        email: 'hello@quotelyinteriors.com'
    };

    const html = generateQuotePdfHtml(dummyQuote, dummyOrg);

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html',
        },
    });
}
