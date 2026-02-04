import { Quote, PDFTemplate } from "@/lib/types";

export function generateQuotePdfHtml(quoteData: any, orgSettings: any = null, pdfSettings: any = null): string {
  // Handle nested snapshot if present
  const data = quoteData.snapshot || quoteData;
  const customerName = data.customer_name || quoteData.customer_name || 'Customer';
  const createdDate = new Date(quoteData.created_at || new Date()).toISOString().split('T')[0];
  const families = data.families || quoteData.families || [];
  const totalAmount = parseFloat(data.total_amount || quoteData.total_amount || 0).toFixed(2);

  // Use dynamic org settings
  const orgName = orgSettings?.name || "Quotely";
  const orgLogo = orgSettings?.logo_url || "https://www.reflectyourvibe.in/images/favicon.svg";
  const orgContact = orgSettings?.contact_number || "+91 1234567890";
  const orgEmail = orgSettings?.email || "support@quotely.com";

  let htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <title>Quotation for ${customerName}</title>
        <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; line-height: 1.4; }
            p { margin: 0; font-size: 10px; }
            h1 { color: #1a1a1a; margin: 0; font-size: 28px; }
            h2, h3 { color: #333; margin-block: 10px; }
            h3 { font-size: 18px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { font-size: 11px; padding: 2px 0px; text-align: left; }
            th { border-top: 2px solid #333; border-bottom: 2px solid #333; background-color: #f9f9f9; font-weight: bold; }
            td { border-bottom: 1px solid #eee; }
            .header-container { display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px; }
            .logo-section { display: flex; align-items: center; gap: 8px; }
            .info-section { display: grid; grid-template-columns: 1fr 280px; gap: 10px; margin-top: 20px; }
            .info-box { flex: 1; }
            .total { font-weight: bold; background-color: #f9f9f9; }
            .grand-total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 30px; padding: 10px; border-top: 2px solid #333; }
        </style>
    </head>
    <body>
        <div class="header-container">
            <div class="logo-section">
                <img src="${orgLogo}" alt="Logo" style="width: 50px; height: 50px; object-fit: contain;">
                <div>
                    <div style="font-size: 16px; font-weight: bold; color: #000;">${orgName}</div>
                    <p style="margin: 2px 0;">Contact: ${orgContact}</p>
                    <p style="margin: 2px 0;">Email: ${orgEmail}</p>
                </div>
            </div>
            <h1>QUOTATION</h1>
        </div>
        <hr style="border: 1px solid #333;" />
        <div class="info-section">
            <div class="info-box">
                <p style="padding-bottom: 8px;"><strong>CUSTOMER DETAILS:</strong></p>
                <div style="display: grid; grid-template-columns: 80px 1fr; gap: 4px;">
                    <p><strong>Name:</strong></p>
                    <p>${customerName}</p>
                    <p><strong>Email:</strong></p>
                    <p>${data.customer_email || ''}</p>
                    <p><strong>Phone:</strong></p>
                    <p>${data.customer_phone || ''}</p>
                    <p><strong>Address:</strong></p>
                    <p>${data.customer_address || ''}</p>
                </div>
            </div>
            <div class="info-box" style="text-align: right;">
                <div style="display: grid; grid-template-columns: 80px 1fr; gap: 4px;">
                    <p><strong>DATE:</strong></p>
                    <p>${createdDate}</p>
                    <p><strong>QUOTE ID:</strong></p>
                    <p>${quoteData.display_id || quoteData.id || quoteData.SK?.split('#')[1] || 'NEW'}</p>
                </div>
            </div>
        </div>

        <p style="font-size: 14px; margin-top: 20px;">Dear Sir/Ma'am, Thank you for your interest in our services. Please find our formal quotation below:</p>
  `;

  for (const family of families) {
    const familyName = family.family_name || 'Family';
    htmlContent += `<h3>${familyName}</h3>`;

    let columns = pdfSettings?.columns || [];
    if (!columns || columns.length === 0) {
        columns = [
            { key: 'item', label: 'DESCRIPTION' },
            { key: 'qty', label: 'QTY', align: 'end' },
            { key: 'unit_price', label: 'PRICE', align: 'end' },
            { key: 'total', label: 'TOTAL', align: 'end' }
        ];
    }

    // Table Header
    htmlContent += `
        <table>
            <thead>
                <tr>
    `;
    
    for (const col of columns) {
        let align = col.align || 'left';
        if (['qty', 'unit_price', 'total', 'price'].includes(col.key)) {
            align = 'end';
        }
        let style = `style="text-align: ${align};"`;
        if (col.key === 'item' || col.key === 'name' || col.label === 'DESCRIPTION') {
            style = `style="min-width: 200px;"`;
        }
        htmlContent += `<th ${style}>${col.label}</th>`;
    }

    htmlContent += `
                </tr>
            </thead>
            <tbody>
    `;

    // Table Body
    const items = family.items || [];
    for (const item of items) {
        htmlContent += `<tr>`;
        for (const col of columns) {
            let val = '';
            let align = col.align || 'left';
            if (['qty', 'unit_price', 'total', 'price', 'base_margin', 'sub_total'].includes(col.key)) {
                align = 'end';
            }
            const key = col.key;

            if (key === 'item' || key === 'name') {
                val = item.name || '';
            } else if (key === 'qty') {
                val = `${parseFloat(item.qty || 0).toFixed(2)} ${(item.unit_type || '').toUpperCase()}`;
            } else if (key === 'unit_type' || key === 'unit') {
                val = (item.unit_type || '').toUpperCase();
            } else if (key === 'family' || key === 'family_name') {
                val = familyName;
            } else if (key === 'unit_price' || key === 'price') {
                val = `INR ${parseFloat(item.unit_price || 0).toFixed(2)}`;
            } else if (key === 'total') {
                val = `INR ${parseFloat(item.total || 0).toFixed(2)}`;
            } else {
                val = item.custom_fields?.[key] || item[key] || '';
            }
            
            htmlContent += `<td style="text-align: ${align};">${val}</td>`;
        }
        htmlContent += `</tr>`;
    }

    const colspan = columns.length - 1;
    const subtotal = parseFloat(family.subtotal || 0);
    const margin = parseFloat(family.margin_applied || 0);
    
    htmlContent += `
            <tr class="total">
                <td colspan="${colspan}">SUB TOTAL</td>
                <td style="text-align: end;">INR ${subtotal.toFixed(2)}</td>
            </tr>
    `;

    if (margin > 0) {
        htmlContent += `
            <tr class="total">
                <td colspan="${colspan}">Margin Applied (${(margin * 100).toFixed(0)}%)</td>
                <td style="text-align: end;">INR ${(subtotal * margin).toFixed(2)}</td>
            </tr>
            <tr class="total">
                <td colspan="${colspan}">SECTION TOTAL</td>
                <td style="text-align: end;">INR ${(subtotal * (1 + margin)).toFixed(2)}</td>
            </tr>
        `;
    }

    htmlContent += `
        </tbody>
    </table>
    `;
  }

  htmlContent += `
        <div class="grand-total">
            GRAND TOTAL: INR ${totalAmount}
        </div>
    </body>
    </html>
  `;

  return htmlContent;
}
