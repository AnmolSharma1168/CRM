'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Search, SlidersHorizontal, Mail, Phone, MapPin, ShoppingBag } from 'lucide-react';
import { Card, Button, Input, Badge, Skeleton } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCurrency, formatRelativeDate } from '@/lib/utils';
import type { Customer } from '@/lib/types';
import { cn } from '@/lib/utils';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');
  const [cities, setCities] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [minSpent, setMinSpent] = useState('');
  const [maxSpent, setMaxSpent] = useState('');

  const pageSize = 20;

  const loadCities = async () => {
    try {
      const res = await api.customers.cities();
      setCities(res.data);
    } catch {/* DB not ready */}
  };

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, pageSize };
      if (search) params.search = search;
      if (city) params.city = city;
      if (minSpent) params.minSpent = Number(minSpent);
      if (maxSpent) params.maxSpent = Number(maxSpent);

      const res = await api.customers.list(params);
      setCustomers(res.data as Customer[]);
      setTotal(res.total);
    } finally {
      setLoading(false);
    }
  }, [page, search, city, minSpent, maxSpent]);

  useEffect(() => {
    loadCities();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadCustomers();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, city, minSpent, maxSpent]);

  useEffect(() => {
    loadCustomers();
  }, [page]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Users className="w-6 h-6 text-cyan-400" />
            <h1 className="text-2xl font-bold">Customers</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            {total.toLocaleString('en-IN')} customers in your database
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          leftIcon={<SlidersHorizontal className="w-3.5 h-3.5" />}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters
        </Button>
      </div>

      {/* Search + Filters */}
      <Card className="mb-6">
        <Input
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="mb-0"
        />
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full bg-secondary/50 border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c} value={c} className="bg-card">{c}</option>
                ))}
              </select>
            </div>
            <Input
              label="Min Spent (₹)"
              type="number"
              placeholder="0"
              value={minSpent}
              onChange={(e) => setMinSpent(e.target.value)}
            />
            <Input
              label="Max Spent (₹)"
              type="number"
              placeholder="Any"
              value={maxSpent}
              onChange={(e) => setMaxSpent(e.target.value)}
            />
          </div>
        )}
      </Card>

      {/* Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-secondary/20">
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">City</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Spent</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Orders</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Last Order</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                Array(8).fill(0).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="px-6 py-4">
                      <Skeleton className="h-8" />
                    </td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    No customers found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-violet-500/20 border border-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400 shrink-0">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{customer.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          <span className="truncate max-w-[160px]">{customer.email}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm">
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                        {customer.city}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-semibold text-emerald-400">
                        {formatCurrency(customer.total_spent)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-sm">
                        <ShoppingBag className="w-3.5 h-3.5 text-muted-foreground" />
                        {customer.order_count}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatRelativeDate(customer.last_order_date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {customer.tags.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant={tag === 'vip' ? 'warning' : tag === 'dormant' ? 'error' : 'default'}>
                            {tag}
                          </Badge>
                        ))}
                        {customer.tags.length > 2 && (
                          <Badge>+{customer.tags.length - 2}</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-border/50 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total.toLocaleString('en-IN')}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
