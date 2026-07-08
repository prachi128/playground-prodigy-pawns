import type { ChildInfo } from '@/lib/api';

export function isBillableChild(child: ChildInfo): boolean {
  return child.payment_status != null && child.batch_id != null;
}

export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function paymentDueLabel(child: ChildInfo): string | null {
  if (!isBillableChild(child) || child.payment_status === 'paid') return null;
  if (child.is_join_month) {
    return 'No deadline this month — newly joined batch';
  }
  if (child.payment_due_day) {
    return `Due by the ${child.payment_due_day}th of this month`;
  }
  return null;
}
