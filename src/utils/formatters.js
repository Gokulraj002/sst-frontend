import { format, formatDistanceToNow, parseISO, isValid } from 'date-fns';

/**
 * Format amount in Indian currency format ₹1,23,456
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const num = parseFloat(amount);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format amount in short form: ₹1.2L, ₹12.5K
 */
export function formatCurrencyL(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  const num = parseFloat(amount);
  if (num >= 100000) {
    return `₹${(num / 100000).toFixed(1)}L`;
  } else if (num >= 1000) {
    return `₹${(num / 1000).toFixed(1)}K`;
  }
  return `₹${num.toFixed(0)}`;
}

/**
 * Format date string to "15 Jan 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (!isValid(date)) return dateStr;
    return format(date, 'd MMM yyyy');
  } catch {
    return dateStr;
  }
}

/**
 * Format date string to "2026-01-15" for input[type=date] fields
 */
export function formatDateInput(dateStr) {
  if (!dateStr) return '';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (!isValid(date)) return '';
    return format(date, 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

/**
 * Return relative time: "2 hours ago", "3 days ago"
 */
export function timeAgo(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = typeof dateStr === 'string' ? parseISO(dateStr) : new Date(dateStr);
    if (!isValid(date)) return dateStr;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return dateStr;
  }
}

/**
 * Format phone number to +91-98765-43210
 */
export function formatPhone(phone) {
  if (!phone) return '—';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `+91-${clean.slice(0, 5)}-${clean.slice(5)}`;
  }
  if (clean.length === 12 && clean.startsWith('91')) {
    const num = clean.slice(2);
    return `+91-${num.slice(0, 5)}-${num.slice(5)}`;
  }
  return phone;
}

/**
 * Format number with Indian comma separators: 1,23,456
 */
export function formatNumber(num) {
  if (num === null || num === undefined || isNaN(num)) return '0';
  return new Intl.NumberFormat('en-IN').format(parseFloat(num));
}

/**
 * Get Bootstrap color class based on status string
 */
export function getStatusColor(status) {
  if (!status) return 'secondary';
  const s = status.toLowerCase();

  // Green / success
  if (['confirmed', 'approved', 'paid', 'active', 'converted', 'completed', 'won', 'open', 'accepted'].includes(s)) {
    return 'success';
  }
  // Red / danger
  if (['cancelled', 'rejected', 'lost', 'inactive', 'overdue', 'unpaid', 'closed'].includes(s)) {
    return 'danger';
  }
  // Yellow / warning
  if (['pending', 'partial', 'in process', 'awaiting', 'revision', 'draft', 'processing', 'warm', 'follow-up'].includes(s)) {
    return 'warning';
  }
  // Blue / info
  if (['new enquiry', 'qualified', 'cold', 'not required', 'docs collecting'].includes(s)) {
    return 'info';
  }
  // Orange
  if (['hot', 'high', 'urgent', 'negotiation'].includes(s)) {
    return 'danger';
  }
  return 'secondary';
}

/**
 * Get badge class for status display (matches erp.html badge styles)
 */
export function getStatusBadgeClass(status) {
  if (!status) return 'badge-secondary';
  const s = status.toLowerCase();
  const map = {
    hot: 'badge-hot',
    warm: 'badge-warm',
    cold: 'badge-cold',
    won: 'badge-won',
    converted: 'badge-won',
    lost: 'badge-lost',
    confirmed: 'badge-confirmed',
    pending: 'badge-pending',
    cancelled: 'badge-cancelled',
    approved: 'badge-approved',
    rejected: 'badge-rejected',
    paid: 'badge-paid',
    unpaid: 'badge-unpaid',
    partial: 'badge-partial',
    active: 'badge-confirmed',
    inactive: 'badge-cancelled',
  };
  return map[s] || 'badge-pending';
}

/**
 * Truncate text to given length
 */
export function truncate(text, length = 50) {
  if (!text) return '';
  return text.length > length ? `${text.substring(0, length)}...` : text;
}

/**
 * Generate a sequential reference number
 */
export function generateRef(prefix, num) {
  return `${prefix}-${String(num).padStart(3, '0')}`;
}
