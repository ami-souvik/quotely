'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getQuote, generatePdf, getPresignedUrl, Quote, getTemplateSettings, getPDFTemplates, PDFTemplate } from '@/lib/api/quotes';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, Edit, Download, FileText } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const QuoteDetailPage: React.FC = () => {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [columns, setColumns] = useState<any[]>([]);

  // PDF Template State
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [pdfTemplates, setPdfTemplates] = useState<PDFTemplate[]>([]);
  const [selectedPdfTemplate, setSelectedPdfTemplate] = useState<string>('');

  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        try {
          const [fetchedQuote, templateSettings] = await Promise.all([
            getQuote(id),
            getTemplateSettings()
          ]);
          setQuote(fetchedQuote);

          if (templateSettings && templateSettings.length > 0) {
            setColumns(templateSettings);
          } else {
            setColumns([
              { key: 'name', label: 'Item' },
              { key: 'qty', label: 'Qty' },
              { key: 'price', label: 'Price' },
              { key: 'total', label: 'Total' }
            ]);
          }

        } catch (err: any) {
          setError(err.message || 'Failed to fetch quote.');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [id]);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      // 1. Fetch available templates
      const templates = await getPDFTemplates().catch(e => {
        console.error("Failed to fetch templates", e);
        return [];
      });

      // 2. If existing templates, ask user
      if (templates.length > 0) {
        setPdfTemplates(templates);
        // Default to first one or previously selected?
        setSelectedPdfTemplate(templates[0].id);
        setShowTemplateDialog(true);
        setDownloading(false); // Stop spinner, wait for user input
        return;
      }

      // 3. Fallback: Default/Legacy generation
      await generatePdf(id);
      const url = await getPresignedUrl(id);
      window.open(url, '_blank');
      setDownloading(false);
    } catch (err: any) {
      console.error("Download failed", err);
      // Fallback: maybe it was already there?
      try {
        await generatePdf(id);
        const url = await getPresignedUrl(id);
        window.open(url, '_blank');
        setDownloading(false);
      } catch (e) {
        alert('Failed to generate and download PDF.');
        setDownloading(false);
      }
    }
  };

  const confirmDownloadPdf = async () => {
    setShowTemplateDialog(false);
    setDownloading(true);
    try {
      await generatePdf(id, selectedPdfTemplate);
      const url = await getPresignedUrl(id);
      window.open(url, '_blank');
    } catch (err: any) {
      console.error("Template PDF Download failed", err);
      alert('Failed to generate PDF with template.');
    } finally {
      setDownloading(false);
    }
  };

  const renderCell = (item: any, family: any, colKey: string) => {
    if (colKey === 'name' || colKey === 'item') return item.name;
    if (colKey === 'qty') return `${item.qty} ${item.unit_type || ''}`;
    if (colKey === 'unit_type' || colKey === 'unit') return item.unit_type;
    if (colKey === 'family' || colKey === 'family_name') return family.family_name;
    if (colKey === 'unit_price' || colKey === 'price') return Number(item.unit_price).toFixed(2);
    if (colKey === 'total') return Number(item.total).toFixed(2);

    // Custom fields
    return item.custom_fields?.[colKey] || item[colKey] || '';
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  if (error) return <div className="text-red-500 p-8">{error}</div>;
  if (!quote) return <div className="p-8">Quote not found.</div>;

  const details = quote.snapshot as any || quote;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* ... Header buttons ... */}
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
                    {columns.map((col, idx) => (
                      <th key={col.key} scope="col" className={`p-2 md:px-6 md:py-3 text-left text-xs font-medium text-gray-500 uppercase ${col.key === 'total' ? 'sticky right-0 bg-gray-100 z-10 shadow-[-4px_0_4px_-4px_rgba(0,0,0,0.1)]' : ''} ${idx === 0 ? 'min-w-[150px]' : 'min-w-[80px]'}`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {family.items?.map((item: any, idx: number) => (
                    <tr key={idx}>
                      {columns.map(col => (
                        <td key={col.key} className={`p-2 md:px-6 md:py-4 whitespace-nowrap text-xs border-b ${col.key === 'total' ? 'sticky right-0 bg-white z-10 shadow-[-4px_0_4px_-4px_rgba(0,0,0,0.1)] text-right' : ''}`}>
                          {renderCell(item, family, col.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="bg-muted/50 font-medium">
                    <td colSpan={Math.max(1, columns.length - 1)} className="p-2 md:px-6 md:py-4 text-right">Subtotal</td>
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
            <span>GRAND TOTAL</span>
            <span>INR {details.total_amount?.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select PDF Template</DialogTitle>
            <DialogDescription>
              Choose a template format for the quotation PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={selectedPdfTemplate} onValueChange={setSelectedPdfTemplate}>
              {pdfTemplates.map(tmpl => (
                <div key={tmpl.id} className="flex items-center space-x-2 mb-2 p-2 rounded hover:bg-slate-50 border border-transparent hover:border-slate-100">
                  <RadioGroupItem value={tmpl.id} id={`tmpl-${tmpl.id}`} />
                  <Label htmlFor={`tmpl-${tmpl.id}`} className="flex-1 cursor-pointer flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {tmpl.name}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>Cancel</Button>
            <Button onClick={confirmDownloadPdf} disabled={downloading}>
              {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Generate & Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuoteDetailPage;