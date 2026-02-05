
import { renderToBuffer } from '@react-pdf/renderer';
import { QuotePDFDocument } from './pdf-document';
import React from 'react';

export async function generatePdfBuffer(quoteData: any, orgSettings: any, pdfSettings: any): Promise<Buffer> {
    const buffer = await renderToBuffer(
        React.createElement(QuotePDFDocument, { quoteData, orgSettings, pdfSettings }) as any
    );
    return buffer;
}
