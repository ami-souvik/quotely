'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getQuotes, deleteQuote, Quote } from '@/lib/api/quotes';
import { Plus, Search, Eye, Edit, Trash2 } from 'lucide-react';
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const AllQuotesPage: React.FC = () => {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = async () => {
    try {
      setLoading(true);
      const data = await getQuotes();
      setQuotes(data);
      setFilteredQuotes(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quotes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotes();
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

      <Card>
        <CardHeader>
          <CardTitle>Quotations</CardTitle>
          <CardDescription>
            A list of all your quotations including their status and amount.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
};

export default AllQuotesPage;
