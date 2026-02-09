import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '@/lib/auth-server';
import { services } from '@/lib/services';

import { generatePdfBuffer } from '@/lib/pdf';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const user = await authenticate(req);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id: quoteId } = await params;
    // const orgId = user.org_id; // Using user's org. If Admin viewing other org, logic differs.
    // Assuming user can only generate for their org.
    
    // 1. Get Quote
    const quote = await services.getQuotation(user.org_id, quoteId);
    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

    // 2. Determine Template Columns
    let pdfSettings: any = null;
    let templateIdToCheck = null;

    try {
        const body = await req.json();
        if (body.template_id) templateIdToCheck = body.template_id;
    } catch (e) {
        // Body reading might fail if empty/not-json, ignore
    }

    // If not in body, check quote's assigned template
    if (!templateIdToCheck && quote.template_id) {
        templateIdToCheck = quote.template_id;
    }

    if (templateIdToCheck) {
        const template = await services.getTemplate(user.org_id, templateIdToCheck);
        if (template) {
            // Use only selected columns for the PDF
            pdfSettings = { columns: template.columns.filter((c: any) => c.selected !== false) };
        }
    }

    if (!pdfSettings) {
        // Fallback to legacy settings or defaults
        const columns = await services.getTemplateSettings(user.org_id);
        if (columns && columns.length > 0) {
            pdfSettings = { columns };
        } else {
            // Hard defaults if nothing else is found
            pdfSettings = { columns: [
                  { key: 'name', label: 'Item Name' },
                  { key: 'quantity', label: 'Quantity' },
                  { key: 'unit_type', label: 'Unit' },
                  { key: 'price', label: 'Price' },
                  { key: 'total', label: 'Total' }
             ]};
        }
    }

    // 3. Get Organization Settings
    const orgSettings = await services.getOrganization(user.org_id);
    
    // 4. Generate HTML
    const quoteData = { ...quote, ...(quote.snapshot || {}) };
    // 4. Generate PDF
    try {
        const pdfBuffer = await generatePdfBuffer(quoteData, orgSettings, pdfSettings);
        
        // 5. Upload to S3
        const s3Url = await services.uploadPDFToS3(pdfBuffer, user.org_id, quoteId);
        
        if (s3Url) {
            // 6. Update Quote
            await services.updateQuotationS3Link(user.org_id, quoteId, s3Url);
            return NextResponse.json({ success: true, url: s3Url });
        } else {
            return NextResponse.json({ error: 'Failed to upload PDF' }, { status: 500 });
        }

    } catch (e) {
        console.error("PDF Gen Error:", e);
        return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
    }
}
