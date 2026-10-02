import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, DollarSign, Loader2, PackageCheck, ShoppingBag } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { loadProductOrders, ProductOrder, updateProductOrderFulfillment } from '../../services/salesService';

const formatMoney = (amount: number, currency: string) => new Intl.NumberFormat(undefined, { style: 'currency', currency: currency.toUpperCase() }).format(amount / 100);

export const SalesDashboard: React.FC = () => {
  const { activeProfile, showToast } = useApp();
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrder, setBusyOrder] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void loadProductOrders(activeProfile.id).then(result => { if (!cancelled) { setOrders(result); setError(null); } }).catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load sales data.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeProfile.id]);

  const paidOrders = useMemo(() => orders.filter(order => order.payment_status === 'paid'), [orders]);
  const physicalOrders = useMemo(() => paidOrders.filter(order => order.physical_product), [paidOrders]);
  const gross = paidOrders.reduce((total, order) => total + order.amount_total, 0);
  const currency = paidOrders[0]?.currency || orders[0]?.currency || 'usd';

  const [trackingModalOrder, setTrackingModalOrder] = useState<ProductOrder | null>(null);
  const [carrierInput, setCarrierInput] = useState('');
  const [trackingNumberInput, setTrackingNumberInput] = useState('');

  const updateFulfillment = async (order: ProductOrder, status: 'processing' | 'fulfilled' | 'cancelled', trackingNumber = '', trackingUrl = '') => {
    setBusyOrder(order.id); setError(null);
    try {
      const updated = await updateProductOrderFulfillment(order.id, status, trackingNumber || order.tracking_number || '', trackingUrl || order.tracking_url || '');
      setOrders(current => current.map(candidate => candidate.id === order.id ? { ...candidate, ...updated } : candidate));
      showToast?.(`Order marked ${status}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update fulfillment.'); }
    finally { setBusyOrder(null); }
  };

  const handleOpenFulfillmentModal = (order: ProductOrder) => {
    setTrackingModalOrder(order);
    setCarrierInput('USPS');
    setTrackingNumberInput(order.tracking_number || '');
  };

  const handleConfirmFulfillment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackingModalOrder) return;
    const trackingUrl = trackingNumberInput.trim() 
      ? `https://www.google.com/search?q=${encodeURIComponent(`${carrierInput} tracking ${trackingNumberInput}`)}` 
      : '';
    await updateFulfillment(trackingModalOrder, 'fulfilled', trackingNumberInput.trim(), trackingUrl);
    setTrackingModalOrder(null);
  };

  return <div className="studio-page flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><div className="mx-auto w-full max-w-5xl space-y-6">
    <header><div className="flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-accent" /><h2 className="text-lg font-bold text-ink">Sales</h2></div><p className="mt-1 text-xs text-muted">Payments and fulfillment from secure Stripe checkout on @{activeProfile.username}.</p></header>
    {error && <div role="alert" className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-surface p-3 text-xs text-danger"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
    <div className="grid gap-3 sm:grid-cols-4"><div className="rounded-2xl border border-line bg-surface p-4"><p className="text-[11px] text-muted">Gross sales</p><p className="mt-2 text-2xl font-bold text-ink">{formatMoney(gross, currency)}</p></div><div className="rounded-2xl border border-line bg-surface p-4"><p className="text-[11px] text-muted">Paid orders</p><p className="mt-2 text-2xl font-bold text-ink">{paidOrders.length}</p></div><div className="rounded-2xl border border-line bg-surface p-4"><p className="text-[11px] text-muted">To fulfill</p><p className="mt-2 text-2xl font-bold text-ink">{physicalOrders.filter(order => ['pending', 'processing'].includes(order.fulfillment_status || '')).length}</p></div><div className="rounded-2xl border border-line bg-surface p-4"><p className="text-[11px] text-muted">Checkout status</p><p className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-success"><CheckCircle2 className="h-4 w-4" />Stripe connected</p></div></div>
    <section className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="border-b border-line px-4 py-3"><h3 className="text-sm font-semibold text-ink">Recent orders and memberships</h3></div>{loading ? <div className="flex items-center justify-center gap-2 p-10 text-xs text-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading sales…</div> : orders.length === 0 ? <div className="p-10 text-center"><DollarSign className="mx-auto h-8 w-8 text-subtle" /><p className="mt-3 text-sm font-semibold text-ink">No orders yet</p><p className="mt-1 text-xs text-muted">Enable secure checkout on a product or membership block to start selling.</p></div> : <div className="divide-y divide-line">{orders.map(order => <div key={order.id} className="flex flex-col gap-3 px-4 py-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium text-ink">{order.customer_name || order.customer_email || 'Customer'}</p>{order.commerce_type === 'membership' && <span className="rounded-full bg-accent-surface px-2 py-0.5 text-[10px] font-semibold text-accent">Membership</span>}{order.physical_product && <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-semibold text-warning"><PackageCheck className="h-3 w-3" />Physical item</span>}</div><p className="text-[11px] text-muted">{new Date(order.created_at).toLocaleString()} · {order.commerce_type === 'membership' ? order.membership_status || 'pending' : order.payment_status}{order.delivery_sent_at ? ' · Delivered' : order.delivery_url ? ' · Delivery pending' : ''}</p>{order.shipping_address && <p className="mt-1 text-[11px] text-muted">Ship to: {order.shipping_name || 'Customer'} · {order.shipping_address.city || ''}{order.shipping_address.country ? `, ${order.shipping_address.country}` : ''}</p>}</div><span className="text-sm font-semibold text-ink">{formatMoney(order.amount_total, order.currency)}{order.commerce_type === 'membership' && <span className="text-[10px] font-medium text-muted"> / recurring</span>}</span></div>{order.physical_product && order.payment_status === 'paid' && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-canvas p-3"><span className="text-xs font-semibold text-body">Fulfillment: <span className="capitalize">{order.fulfillment_status || 'pending'}</span></span>{order.fulfillment_status !== 'processing' && order.fulfillment_status !== 'fulfilled' && <button type="button" disabled={busyOrder === order.id} onClick={() => void updateFulfillment(order, 'processing')} className="rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-semibold text-body disabled:opacity-50">Start processing</button>}{order.fulfillment_status !== 'fulfilled' && <button type="button" disabled={busyOrder === order.id} onClick={() => handleOpenFulfillmentModal(order)} className="rounded-lg bg-accent px-2.5 py-1.5 text-[11px] font-bold text-white disabled:opacity-50 cursor-pointer">Mark fulfilled</button>}{order.tracking_url && <a href={order.tracking_url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-semibold text-accent">Tracking{order.tracking_number ? ` · ${order.tracking_number}` : ''}</a>}</div>}</div>)}</div>}</section>

    {/* Fulfillment Tracking Entry Modal */}
    {trackingModalOrder && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4">
          <div>
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-accent" />
              <span>Fulfill Order #{trackingModalOrder.id.slice(0, 8)}</span>
            </h3>
            <p className="text-xs text-muted mt-1">
              Add shipping carrier and tracking information for {trackingModalOrder.customer_name || 'Customer'}.
            </p>
          </div>
          <form onSubmit={handleConfirmFulfillment} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-body mb-1">Carrier</label>
              <input
                type="text"
                value={carrierInput}
                onChange={(e) => setCarrierInput(e.target.value)}
                placeholder="e.g. USPS, FedEx, DHL, UPS"
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-body mb-1">Tracking Number (Optional)</label>
              <input
                type="text"
                value={trackingNumberInput}
                onChange={(e) => setTrackingNumberInput(e.target.value)}
                placeholder="e.g. 9400 1000 0000 0000 0000 00"
                className="w-full px-3 py-2 text-xs rounded-xl bg-canvas border border-line text-ink font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTrackingModalOrder(null)}
                className="px-3 py-2 text-xs font-medium text-muted hover:text-ink cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busyOrder === trackingModalOrder.id}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer disabled:opacity-50"
              >
                Complete Fulfillment
              </button>
            </div>
          </form>
        </div>
      </div>
    )}
  </div></div>;
};
