'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Eye, Edit, Trash2, Download, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
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
import { deleteQuote, Quote, generatePdf, getPresignedUrl, getTemplates, Template } from '@/lib/api/quotes';
import axios from 'axios';

const AllQuotesPage: React.FC = () => {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [pdfMode, setPdfMode] = useState<'preview' | 'download'>('preview');

  // PDF Template State
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);
  console.log(templates);
  const fetchQuotes = async () => {
    try {
      setLoading(true);
      await axios.get('/api/quotes/all/')
        .then(res => {
          setQuotes(res.data || [])
          setFilteredQuotes(res.data || [])
        })
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quotes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
    getTemplates().then((res) => {
      setTemplates(res);
    })
  }, []);

  useEffect(() => {
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = quotes.filter(
      (quote) =>
        quote.customer_name?.toLowerCase().includes(lowerQuery) ||
        quote.status?.toLowerCase().includes(lowerQuery)
    );
    setFilteredQuotes(filtered);
  }, [searchQuery, quotes]);

  const handlePdfAction = async (sk: string, mode: 'preview' | 'download') => {
    const quoteId = sk.split('#')[1];
    setProcessingId(quoteId);
    setPdfMode(mode);
    try {
      await generatePdf(quoteId, quotes.find((q) => q.SK === sk)?.template_id || '');
      const url = await getPresignedUrl(quoteId, mode === 'download');
      window.open(url, '_blank');
    } catch (err: any) {
      console.error("PDF action failed", err);
      alert('Failed to generate PDF.');
    } finally {
      setProcessingId(null);
    }
  };

  const confirmPdfAction = async () => {
    if (!activeQuoteId) return;
    setShowTemplateDialog(false);
    setProcessingId(activeQuoteId);
    try {
      await generatePdf(activeQuoteId, selectedTemplate);
      const url = await getPresignedUrl(activeQuoteId, pdfMode === 'download');
      window.open(url, '_blank');
    } catch (err) {
      alert('Failed to generate PDF with template.');
    } finally {
      setProcessingId(null);
      setActiveQuoteId(null);
    }
  };

  const handleDelete = async (sk: string) => {
    if (window.confirm('Are you sure you want to delete this quote?')) {
      const quoteId = sk.split('#')[1];
      try {
        await deleteQuote(quoteId);
        // Optimistic update
        const newQuotes = quotes.filter((q) => q.SK !== sk);
        setQuotes(newQuotes);
        setFilteredQuotes(newQuotes.filter(
          (quote) =>
            quote.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            quote.status?.toLowerCase().includes(searchQuery.toLowerCase())
        ));
      } catch (err) {
        alert('Failed to delete quote.');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">All Quotes</h1>
          <p className="text-muted-foreground">
            Manage and view all your created quotations.
          </p>
        </div>
        <Button onClick={() => router.push('/quotes/editor')}>
          <Plus className="mr-2 h-4 w-4" /> New Quote
        </Button>
      </div>
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by customer or status..."
            className="pl-8 max-w-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading quotes...</div>
      ) : error ? (
        <div className="text-center text-red-500 py-4">{error}</div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount (INR)</TableHead>
                <TableHead className="text-right">Template</TableHead>
                <TableHead className="text-right">Created At</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.length > 0 ? (
                filteredQuotes.map((quote) => {
                  const quoteId = quote.SK.split('#')[1];
                  return (
                    <TableRow key={quote.SK}>
                      <TableCell className="font-medium">
                        {quote.customer_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={quote.status === 'DRAFT' ? 'outline' : 'default'}>
                          {quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {quote.total_amount?.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {templates.find((t) => t.id === quote.template_id)?.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/quotes/${quoteId}`)}
                            title="View"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePdfAction(quote.SK, 'preview')}
                            disabled={processingId === quoteId}
                            title="Download PDF"
                          >
                            {processingId === quoteId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => router.push(`/quotes/editor?id=${quoteId}`)}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(quote.SK)}
                            title="Delete"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No quotes found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select PDF Template</DialogTitle>
            <DialogDescription>
              Choose a template format for the quotation PDF.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup value={selectedTemplate} onValueChange={setSelectedTemplate}>
              {templates.map(tmpl => (
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
            <Button onClick={confirmPdfAction}>
              {processingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Generate & Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AllQuotesPage;
