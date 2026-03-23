// app/(parent)/parent/payments/page.tsx - Payment Page with Stripe

'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { parentAPI, ChildInfo, PaymentRecord } from '@/lib/api';
import { usernameInitial } from '@/lib/avatar';
import { Loader2, CreditCard, CheckCircle, AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ParentPaymentsPage() {
  const searchParams = useSearchParams();
  const [children, setChildren] = useState<ChildInfo[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingFor, setPayingFor] = useState<number | null>(null);

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Payment completed successfully!');
    }
    if (searchParams.get('canceled') === 'true') {
      toast.error('Payment was canceled.');
    }
  }, [searchParams]);

  useEffect(() => {
    Promise.all([
      parentAPI.getChildren(),
      parentAPI.getPaymentHistory(),
    ])
      .then(([c, p]) => {
        setChildren(c);
        setPayments(p);
      })
      .catch(() => toast.error('Failed to load payment data'))
      .finally(() => setLoading(false));
  }, []);

  const handlePay = async (child: ChildInfo) => {
    if (!child.batch_id) {
      toast.error('Child is not assigned to a batch');
      return;
    }
    setPayingFor(child.id);
    try {
      const now = new Date();
      const billingMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const result = await parentAPI.createCheckout({
        student_id: child.id,
        batch_id: child.batch_id,
        billing_month: billingMonth,
      });
      window.location.href = result.checkout_url;
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Failed to start payment');
      setPayingFor(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysUntilDeadline = dayOfMonth <= 10 ? 10 - dayOfMonth : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Payments</h1>
        <p className="text-gray-500">Manage monthly batch payments for your children.</p>
      </div>

      {/* Deadline Banner */}
      <div className={`rounded-xl p-4 flex items-center gap-3 ${
        dayOfMonth > 10
          ? 'bg-red-50 border-2 border-red-200'
          : daysUntilDeadline <= 3
          ? 'bg-amber-50 border-2 border-amber-200'
          : 'bg-blue-50 border-2 border-blue-200'
      }`}>
        <Clock className={`w-5 h-5 flex-shrink-0 ${
          dayOfMonth > 10 ? 'text-red-500' : daysUntilDeadline <= 3 ? 'text-amber-500' : 'text-blue-500'
        }`} />
        <p className={`text-sm font-medium ${
          dayOfMonth > 10 ? 'text-red-700' : daysUntilDeadline <= 3 ? 'text-amber-700' : 'text-blue-700'
        }`}>
          {dayOfMonth > 10
            ? 'Payment deadline has passed for this month. Please pay immediately to avoid disruption.'
            : daysUntilDeadline === 0
            ? 'Today is the payment deadline! Please complete your payment.'
            : `Payment deadline: 10th of every month (${daysUntilDeadline} days remaining)`
          }
        </p>
      </div>

      {/* Current Month Payments */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-emerald-500" />
          Current Month
        </h2>
        <div className="space-y-3">
          {children.map((child) => (
            <div key={child.id} className="bg-white rounded-xl border-2 border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-lg font-bold text-primary-700">
                    {usernameInitial(child.username)}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{child.full_name}</p>
                    <p className="text-sm text-gray-500">
                      {child.batch_name || 'No batch assigned'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {child.payment_status === 'paid' ? (
                    <span className="flex items-center gap-1 text-green-600 font-semibold text-sm">
                      <CheckCircle className="w-4 h-4" /> Paid
                    </span>
                  ) : child.batch_id ? (
                    <button
                      onClick={() => handlePay(child)}
                      disabled={payingFor === child.id}
                      className="flex items-center gap-1 bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-600 transition disabled:opacity-50"
                    >
                      {payingFor === child.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>Pay Now <ArrowRight className="w-4 h-4" /></>
                      )}
                    </button>
                  ) : (
                    <span className="text-gray-400 text-sm">No batch</span>
                  )}
                </div>
              </div>
              {child.payment_status === 'overdue' && (
                <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  Payment is overdue. Your child may be flagged in their batch.
                </div>
              )}
            </div>
          ))}
          {children.length === 0 && (
            <div className="bg-white rounded-xl border-2 border-gray-200 p-8 text-center text-gray-500">
              No children linked to your account.
            </div>
          )}
        </div>
      </div>

      {/* Payment History */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 mb-3">Payment History</h2>
        <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
          {payments.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Date</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Child</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Batch</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Month</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600">Amount</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-700">
                      {p.paid_at
                        ? new Date(p.paid_at).toLocaleDateString()
                        : new Date(p.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{p.student_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{p.batch_name || '-'}</td>
                    <td className="px-4 py-3 text-gray-700">{p.billing_month}</td>
                    <td className="px-4 py-3 text-gray-700 text-right font-medium">
                      {new Intl.NumberFormat('en-IN', {
                        style: 'currency',
                        currency: 'INR',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(p.amount)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : p.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500 text-center py-8">No payment history yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
