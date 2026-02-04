import puppeteer from 'puppeteer';

export async function generatePdfBuffer(html: string): Promise<Buffer> {
    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true // 'new' or true
        });
        const page = await browser.newPage();
        await page.setContent(html, { waitUntil: 'networkidle0' });
        
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: {
                top: '10mm',
                bottom: '10mm',
                left: '10mm',
                right: '10mm'
            }
        });
        // Uint8Array to Buffer
        return Buffer.from(pdfBuffer);
    } catch (e) {
        console.error("Puppeteer error:", e);
        throw e;
    } finally {
        if (browser) await browser.close();
    }
}
