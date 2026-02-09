'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getQuote, generatePdf, getPresignedUrl, Quote, getTemplateSettings, getTemplates, Template } from '@/lib/api/quotes';
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
  const [pdfMode, setPdfMode] = useState<'preview' | 'download'>('preview');

  // PDF Template State
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [templateName, setTemplateName] = useState<string>('');

  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        try {
          const [fetchedQuote, tmpls] = await Promise.all([
            getQuote(id),
            getTemplates().catch(e => { console.error(e); return []; })
          ]);
          setQuote(fetchedQuote);
          setTemplates(tmpls);

          const details = fetchedQuote.snapshot as any || fetchedQuote; // Handle snapshot or live quote

          let activeTmpl = null;
          if (details.template_id) {
            activeTmpl = tmpls.find((t: any) => t.id === details.template_id);
          }

          if (activeTmpl) {
            // Use template columns (filtered for visibility if needed, usually 'selected' prop)
            setColumns(activeTmpl.columns.filter((c: any) => c.selected));
            setTemplateName(activeTmpl.name);
            setSelectedTemplate(activeTmpl.id);
          } else {
            // Fallback default columns
            setColumns([
              { key: 'name', label: 'Item Name' },
              { key: 'quantity', label: 'Quantity' },
              { key: 'unit_type', label: 'Unit' },
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

  const handlePdfAction = async (mode: 'preview' | 'download') => {
    setDownloading(true);
    setPdfMode(mode);
    try {
      // Use the active template for the quotation
      let tmplId = selectedTemplate;

      // Fallback: if no template assigned to quote, use the first available one (default)
      if (!tmplId && templates.length > 0) {
        tmplId = templates[0].id;
      }

      await generatePdf(id, tmplId);
      const url = await getPresignedUrl(id, mode === 'download');
      window.open(url, '_blank');
    } catch (err: any) {
      console.error("PDF action failed", err);
      // Try legacy generation without template ID if specific fail? 
      // Or just alert.
      alert('Failed to generate PDF.');
    } finally {
      setDownloading(false);
    }
  };

  const renderCell = (item: any, family: any, colKey: string) => {
    if (colKey === 'name' || colKey === 'item') return item.name;
    if (colKey === 'quantity') return item.quantity || item.qty || 0;
    if (colKey === 'qty') return `${item.qty} ${item.unit_type || ''}`; // Legacy fallback
    if (colKey === 'unit_type' || colKey === 'unit') return item.unit_type;
    if (colKey === 'family' || colKey === 'family_name') return family.family_name;
    if (colKey === 'unit_price' || colKey === 'price') return Number(item.unit_price || item.price || 0).toFixed(2);
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-4">
        <Button variant="ghost" className="w-fit" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => handlePdfAction('preview')} disabled={downloading}>
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
              <p className="font-medium">{details.display_id || id}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">{new Date(quote.created_at).toLocaleDateString()}</p>
            </div>
            {templateName && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Template</p>
                <p className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" /> {templateName}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="bg-white rounded-md border overflow-hidden">
        {details.families?.map((family: any, index: number) => (
          <div key={`${family.family_id}-${index}`}>
            <div className="flex justify-between items-center p-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">
                  {family.family_name}
                </h2>
                <span className="text-xs font-medium text-gray-500">Subtotal: {family.subtotal.toFixed(2)}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    {columns.map(col => (
                      <th key={col.key || col.id} scope="col" className="h-8 border px-2 text-left text-xs font-medium text-gray-500 uppercase min-w-[100px]">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {family.items?.map((item: any, idx: number) => (
                    <tr key={item.id}>
                      {columns.map(col => (
                        <td key={col.key || col.id} className="w-full border px-2 py-1.5 text-sm">
                          {renderCell(item, family, col.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col items-end gap-2 p-6 bg-white rounded-lg border shadow-sm">
        <div className='flex justify-between w-full text-2xl font-bold'>
          <span>GRAND TOTAL</span>
          <span>INR {details.total_amount?.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
};

export default QuoteDetailPage;