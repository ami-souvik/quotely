'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getQuote, generatePdf, getPresignedUrl, Quote } from '@/lib/api/quotes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Edit, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const QuoteDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (id) {
      const fetchQuote = async () => {
        try {
          const fetchedQuote = await getQuote(id);
          setQuote(fetchedQuote);
        } catch (err: any) {
          setError(err.message || 'Failed to fetch quote.');
        } finally {
          setLoading(false);
        }
      };
      fetchQuote();
    }
  }, [id]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      // Always generate fresh PDF to ensure it matches current data
      // Or we can try to get existing one first.
      // Given the requirement "download the quotation", usually implies latest.
      // But generating every time is slower.
      // Let's try to get presigned URL first.
      // If it fails (404), then generate.
      // Actually, if the user edited the quote, the old PDF is stale.
      // We should probably rely on backend to invalidate PDF on edit.
      // (In `update_quotation` in services.py, we didn't clear s3_pdf_link, so old link remains).
      // Ideally update_quotation should clear s3_pdf_link.
      // For now, I will force generation if it fails, but if it succeeds, it might be old.
      // To be safe, let's just generate it fresh if the user asks for download?
      // Or I can just check if I can download.

      // Let's try generating first to be sure.
      await generatePdf(id);
      const url = await getPresignedUrl(id);
      window.open(url, '_blank');
    } catch (err: any) {
      console.error("Download failed", err);
      // Fallback: maybe it was already there?
      try {
        const url = await getPresignedUrl(id);
        window.open(url, '_blank');
      } catch (e) {
        alert('Failed to generate and download PDF.');
      }
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="text-red-500 p-8">{error}</div>;
  if (!quote) return <div className="p-8">Quote not found.</div>;

  const details = quote.snapshot as any || quote;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleDownloadPdf} disabled={downloading}>
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Download PDF
          </Button>
          <Button onClick={() => router.push(`/quotes/editor?id=${id}`)}>
            <Edit className="mr-2 h-4 w-4" /> Edit Quote
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-2xl font-bold">{details.customer_name}</CardTitle>
          <Badge variant={quote.status === 'DRAFT' ? 'outline' : 'default'}>{quote.status}</Badge>
        </CardHeader>
        <CardContent className='px-4'>
          <div className="grid grid-cols-[2fr_1fr] gap-4 text-sm mt-4">
            <div>
              <p className="text-muted-foreground">Quote ID</p>
              <p className="font-medium">{id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{new Date(quote.created_at).toLocaleDateString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        {details.families?.map((family: any, index: number) => (
          <Card key={index}>
            <CardHeader>
              <CardTitle className="text-lg">{family.family_name} ({family.category})</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="p-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[100px]">Item</th>
                    <th scope="col" className="p-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[50px]">Qty</th>
                    <th scope="col" className="p-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[100px]">Price</th>
                    <th scope="col" className="p-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase min-w-[80px] sticky right-0 bg-gray-100 z-10 shadow-[-4px_0_4px_-4px_rgba(0,0,0,0.1)]">Total</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {family.items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td className="p-2 md:px-6 md:py-4 whitespace-nowrap text-xs border-b">
                        {item.name}
                      </td>
                      <td className="p-2 md:px-6 md:py-4 whitespace-nowrap text-xs border-b">
                        {item.qty} {item.unit_type}
                      </td>
                      <td className="p-2 md:px-6 md:py-4 whitespace-nowrap text-xs border-b">
                        {item.unit_price}
                      </td>
                      <td className="p-2 md:px-6 md:py-4 whitespace-nowrap text-xs border-b sticky right-0 bg-white z-10 shadow-[-4px_0_4px_-4px_rgba(0,0,0,0.1)] text-right">
                        {Number(item.total).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-muted/50 font-medium">
                    <td colSpan={3} className="p-2 md:px-6 md:py-4 text-right">Subtotal</td>
                    <td className="p-2 md:px-6 md:py-4 text-right sticky right-0 bg-muted/50 z-10 shadow-[-4px_0_4px_-4px_rgba(0,0,0,0.1)]">{family.subtotal?.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center text-xl font-bold">
            <span>Grand Total</span>
            <span>INR {details.total_amount?.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteDetailPage;