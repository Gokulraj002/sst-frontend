export const LEAD_STAGES = [
  'New Enquiry',
  'Qualified',
  'Proposal Sent',
  'Quotation Sent',
  'Follow-Up',
  'Negotiation',
  'Advance Paid',
  'Converted',
  'Lost',
];

export const LEAD_TEMPERATURES = ['Hot', 'Warm', 'Cold'];

export const LEAD_SOURCES = [
  'Website',
  'WhatsApp',
  'Referral',
  'Walk-In',
  'Google',
  'Google Ads',
  'Social Media',
  'Instagram',
  'Facebook',
  'Agent',
  'Reference',
  'Other',
];

export const BOOKING_STATUSES = ['Confirmed', 'Pending', 'Cancelled'];

export const TOUR_TYPES = ['FIT', 'GIT', 'Group', 'Corporate', 'MICE', 'Honeymoon', 'Domestic', 'International'];

export const PAYMENT_MODES = ['UPI', 'Cash', 'NEFT', 'Cheque', 'Card', 'RTGS', 'Bank Transfer'];

export const APPROVAL_STATUSES = ['Pending', 'Approved', 'Rejected'];

export const EXPENSE_CATEGORIES = [
  'Travel',
  'Marketing',
  'Office',
  'Software',
  'Commission',
  'Utilities',
  'Salary',
  'Rent',
  'Other',
];

export const VISA_STATUSES = [
  'Docs Collecting',
  'Applied',
  'In Process',
  'Approved',
  'Rejected',
  'Not Required',
];

export const USER_ROLES = [
  { value: 'admin',               label: 'Administrator',        color: '#8e44ad' },
  { value: 'sales_manager',       label: 'Sales Manager',        color: '#2980b9' },
  { value: 'operations_manager',  label: 'Operations Manager',   color: '#16a085' },
  { value: 'finance_manager',     label: 'Finance Manager',      color: '#d35400' },
  { value: 'hr_manager',          label: 'HR Manager',           color: '#c0392b' },
  { value: 'staff',               label: 'Staff',                color: '#27ae60' },
];

export const PERMISSION_MODULES = [
  { section: 'SALES & CRM',   modules: [
    { key: 'leads',       label: 'Lead Management' },
    { key: 'quotations',  label: 'Quotations' },
    { key: 'bookings',    label: 'Bookings' },
  ]},
  { section: 'OPERATIONS',   modules: [
    { key: 'operations',  label: 'Operations Center' },
    { key: 'itinerary',   label: 'Itinerary Builder' },
    { key: 'visa',        label: 'Visa Tracker' },
    { key: 'inventory',   label: 'Group Tour Inventory' },
    { key: 'documents',   label: 'Document Management' },
  ]},
  { section: 'FINANCE',      modules: [
    { key: 'finance',     label: 'Finance & Accounting' },
    { key: 'pnl',         label: 'P&L Statement' },
    { key: 'vendorpay',   label: 'Vendor Payments' },
    { key: 'expenses',    label: 'Expense Management' },
    { key: 'vouchers',    label: 'Voucher Generation' },
    { key: 'refunds',     label: 'Refund & Cancellations' },
  ]},
  { section: 'PEOPLE',       modules: [
    { key: 'hr',          label: 'HR & Payroll' },
    { key: 'customers',   label: 'Customer Database' },
    { key: 'suppliers',   label: 'Supplier Management' },
    { key: 'commissions', label: 'Commission & Incentives' },
  ]},
  { section: 'SYSTEM',       modules: [
    { key: 'approvals',   label: 'Approval Center' },
    { key: 'reports',     label: 'Reports & MIS' },
    { key: 'audit',       label: 'Audit Logs' },
    { key: 'iam',         label: 'User Access Management' },
    { key: 'settings',    label: 'Settings' },
  ]},
];

export const DEPARTMENTS = ['Sales', 'Operations', 'Finance', 'HR', 'Management', 'Marketing'];

export const TASK_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export const VOUCHER_TYPES = ['Payment', 'Receipt', 'Journal', 'Contra'];

export const LOYALTY_TIERS = ['Regular', 'Silver', 'Gold', 'Platinum'];

export const VENDOR_TYPES = ['Hotel', 'Transport', 'Airline', 'Tour Operator', 'Visa', 'Insurance', 'Other'];

export const SIDEBAR_MENU = [
  {
    section: 'MAIN',
    items: [
      { path: '/dashboard', label: 'Dashboard', icon: 'bi-speedometer2' },
      { path: '/notifications', label: 'Notifications', icon: 'bi-bell', badge: true },
    ],
  },
  {
    section: 'SALES & CRM',
    items: [
      { path: '/leads', label: 'Lead Management', icon: 'bi-funnel' },
      { path: '/quotations', label: 'Quotations', icon: 'bi-file-earmark-text' },
      { path: '/bookings', label: 'Bookings', icon: 'bi-calendar-check' },
    ],
  },
  {
    section: 'OPERATIONS',
    items: [
      { path: '/operations', label: 'Operations Center', icon: 'bi-gear-wide-connected' },
      { path: '/itinerary', label: 'Itinerary Builder', icon: 'bi-map' },
      { path: '/visa', label: 'Visa Tracker', icon: 'bi-passport' },
      { path: '/inventory', label: 'Group Tour Inventory', icon: 'bi-people' },
      { path: '/documents', label: 'Document Management', icon: 'bi-folder2-open' },
    ],
  },
  {
    section: 'FINANCE',
    items: [
      { path: '/finance', label: 'Finance & Accounting', icon: 'bi-cash-stack' },
      { path: '/pnl', label: 'P&L Statement', icon: 'bi-graph-up-arrow' },
      { path: '/vendorpay', label: 'Vendor Payments', icon: 'bi-credit-card' },
      { path: '/expenses', label: 'Expense Management', icon: 'bi-receipt' },
      { path: '/vouchers', label: 'Voucher Generation', icon: 'bi-ticket-perforated' },
      { path: '/refunds', label: 'Refund & Cancellations', icon: 'bi-arrow-counterclockwise' },
    ],
  },
  {
    section: 'PEOPLE',
    items: [
      { path: '/hr', label: 'HR & Payroll', icon: 'bi-person-badge' },
      { path: '/customers', label: 'Customer Database', icon: 'bi-person-lines-fill' },
      { path: '/suppliers', label: 'Supplier Management', icon: 'bi-building' },
      { path: '/commissions', label: 'Commission & Incentives', icon: 'bi-percent' },
    ],
  },
  {
    section: 'SYSTEM',
    items: [
      { path: '/approvals', label: 'Approval Center', icon: 'bi-check2-circle' },
      { path: '/reports', label: 'Reports & MIS', icon: 'bi-bar-chart-line' },
      { path: '/audit', label: 'Audit Logs', icon: 'bi-shield-check' },
      { path: '/iam', label: 'User Access Management', icon: 'bi-key' },
      { path: '/settings', label: 'Settings', icon: 'bi-gear' },
    ],
  },
];
