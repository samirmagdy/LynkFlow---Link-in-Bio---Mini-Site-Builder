import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, DollarSign, Loader2, ShoppingBag } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { loadProductOrders, ProductOrder } from '../../services/salesService';

const formatMoney = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);

export const SalesDashboard: React.FC = () => {
  const { activeProfile } = useApp();
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadProductOrders(activeProfile.id).then(result => { if (!cancelled) { setOrders(result); setError(null); } }).catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load sales data.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeProfile.id]);

  const paidOrders = useMemo(() => orders.filter(order => order.payment_status === 'paid'), [orders]);
  const gross = paidOrders.reduce((total, order) => total + order.amount_total, 0);
  const currency = paidOrders[0]?.currency || orders[0]?.currency || 'usd';

  return <div className="studio-page flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><div className="mx-auto w-full max-w-5xl space-y-6">
    <header><div className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-accent" /><h2 className="text-lg font-bold text-ink">Sales</h2></div><p className="mt-1 text-xs text-muted">Payments from secure Stripe checkout on @{activeProfile.username}.</p></header>
    {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-surface p-3 text-xs text-danger"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
    <div className="grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-line bg-surface p-4"><p className="text-[11px] text-muted">Gross sales</p><p className="mt-2 text-2xl font-bold text-ink">{formatMoney(gross, currency)}</p></div><div className="rounded-2xl border border-line bg-surface p-4"><p className="text-[11px] text-muted">Paid orders</p><p className="mt-2 text-2xl font-bold text-ink">{paidOrders.length}</p></div><div className="rounded-2xl border border-line bg-surface p-4"><p className="text-[11px] text-muted">Checkout status</p><p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-success"><CheckCircle2 className="h-4 w-4" />Stripe connected</p></div></div>
    <section className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="border-b border-line px-4 py-3"><h3 className="text-sm font-semibold text-ink">Recent orders</h3></div>{loading ? <div className="flex items-center justify-center gap-2 p-10 text-xs text-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading sales…</div> : orders.length === 0 ? <div className="p-10 text-center"><DollarSign className="mx-auto h-8 w-8 text-subtle" /><p className="mt-3 text-sm font-semibold text-ink">No orders yet</p><p className="mt-1 text-xs text-muted">Enable secure checkout on a product block to start selling.</p></div> : <div className="divide-y divide-line">{orders.map(order => <div key={order.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium text-ink">{order.customer_name || order.customer_email || 'Customer'}</p><p className="text-[11px] text-muted">{new Date(order.created_at).toLocaleString()} · {order.payment_status}</p></div><span className="text-sm font-semibold text-ink">{formatMoney(order.amount_total, order.currency)}</span></div>)}</div>}</section>
  </div></div>;
};
