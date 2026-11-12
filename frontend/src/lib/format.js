// Utility functions — matches Base44 format.js exactly

export const formatINR = (n) => {
  if (n === null || n === undefined || n === '') return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(2).replace(/\.00$/, '')} Cr`;
  if (num >= 100000)   return `₹${(num / 100000).toFixed(2).replace(/\.00$/, '')} L`;
  return `₹${num.toLocaleString('en-IN')}`;
};

export const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

export const NDA_STATUS_LABEL = {
  pending: 'Pending',
  accepted_by_buyer: 'Accepted by Buyer',
  accepted_by_seller: 'Accepted by Seller',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const DEAL_STATUS_LABEL = {
  nda_completed: 'NDA Completed',
  discussion_in_progress: 'Discussion in Progress',
  discussion: 'Discussion in Progress',
  meeting_scheduled: 'Meeting Scheduled',
  under_negotiation: 'Under Negotiation',
  offer_made: 'Offer Made',
  offer_accepted: 'Offer Accepted',
  deal_closed: 'Deal Closed',
  completed: 'Deal Closed',
  deal_cancelled: 'Deal Cancelled',
  cancelled: 'Deal Cancelled',
};

export const MEETING_STATUS_LABEL = {
  requested: 'Requested',
  accepted: 'Accepted',
  confirmed: 'Confirmed',
  reschedule_proposed: 'Reschedule Proposed',
  rescheduled: 'Rescheduled',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  completed: 'Completed',
};

export const LISTING_STATUS_LABEL = {
  draft: 'Draft',
  pending: 'Pending Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  under_offer: 'Under Negotiation',
  sold: 'Sold',
  inactive: 'Inactive',
};

export const REQUEST_STATUS_LABEL = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
  withdrawn: 'Withdrawn',
};
