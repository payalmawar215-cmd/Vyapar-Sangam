import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  KeyRound, CalendarDays, FileText, ChevronDown, ChevronUp,
  Clock, CheckCircle2, History, ArrowRight, MessageSquare, ExternalLink,
  Users, Phone
} from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import MutualContactSharing from "@/components/common/MutualContactSharing";
import { dealService } from "@/services/ndaService";
import { formatDate, formatINR } from "@/lib/format";

// Permitted statuses for business acquisition lifecycle
export const PERMITTED_DEAL_STATUSES = [
  { value: "nda_completed", label: "NDA Completed" },
  { value: "discussion_in_progress", label: "Discussion in Progress" },
  { value: "meeting_scheduled", label: "Meeting Scheduled" },
  { value: "under_negotiation", label: "Under Negotiation" },
  { value: "offer_made", label: "Offer Made" },
  { value: "offer_accepted", label: "Offer Accepted" },
  { value: "deal_closed", label: "Deal Closed" },
  { value: "deal_cancelled", label: "Deal Cancelled" },
];

const STATUS_DISPLAY_MAP = {
  nda_completed: "NDA Completed",
  discussion_in_progress: "Discussion in Progress",
  discussion: "Discussion in Progress",
  meeting_scheduled: "Meeting Scheduled",
  under_negotiation: "Under Negotiation",
  offer_made: "Offer Made",
  offer_accepted: "Offer Accepted",
  deal_closed: "Deal Closed",
  completed: "Deal Closed",
  deal_cancelled: "Deal Cancelled",
  cancelled: "Deal Cancelled",
};

const STATUS_COLOR_MAP = {
  nda_completed: "border-border text-muted-foreground",
  discussion_in_progress: "border-accent text-accent",
  discussion: "border-accent text-accent",
  meeting_scheduled: "border-blue-500/60 text-blue-600 bg-blue-50/50",
  under_negotiation: "border-amber-500/60 text-amber-700 bg-amber-50/50",
  offer_made: "border-purple-500/60 text-purple-700 bg-purple-50/50",
  offer_accepted: "border-emerald-500/60 text-emerald-700 bg-emerald-50/50",
  deal_closed: "border-green-600 text-green-700 bg-green-50",
  completed: "border-green-600 text-green-700 bg-green-50",
  deal_cancelled: "border-destructive/40 text-destructive bg-destructive/5",
  cancelled: "border-destructive/40 text-destructive bg-destructive/5",
};

export default function DealsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [deals, setDeals] = useState(null);
  const [tab, setTab] = useState("all");
  const [expandedHistory, setExpandedHistory] = useState({});
  const [updatingId, setUpdatingId] = useState(null);
  const [statusModal, setStatusModal] = useState(null); // { deal, newStatus, note }

  const load = async () => {
    try {
      const res = await dealService.getAll();
      const items = Array.isArray(res.data) ? res.data : res.data.results || [];
      setDeals(items);
    } catch {
      setDeals([]);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const [expandedContacts, setExpandedContacts] = useState({});

  const toggleHistory = (dealId) => {
    setExpandedHistory((prev) => ({ ...prev, [dealId]: !prev[dealId] }));
  };

  const toggleContacts = (dealId) => {
    setExpandedContacts((prev) => ({ ...prev, [dealId]: !prev[dealId] }));
  };

  const openStatusChange = (deal, newStatus) => {
    if (deal.status === newStatus) return;
    setStatusModal({ deal, newStatus, note: "" });
  };

  const confirmStatusChange = async () => {
    if (!statusModal) return;
    const { deal, newStatus, note } = statusModal;
    setUpdatingId(deal.id);
    try {
      await dealService.update(deal.id, {
        status: newStatus,
        note: note.trim() || undefined,
      });
      toast({ description: `Deal status updated to "${STATUS_DISPLAY_MAP[newStatus] || newStatus}".` });
      setStatusModal(null);
      await load();
    } catch (err) {
      const errMsg = err?.response?.data?.error || "Could not update the deal. Please try again.";
      toast({ description: errMsg, variant: "destructive" });
    } finally {
      setUpdatingId(null);
    }
  };

  const isClosed = (s) => ["deal_closed", "completed"].includes(s);
  const isCancelled = (s) => ["deal_cancelled", "cancelled"].includes(s);
  const isActive = (s) => !isClosed(s) && !isCancelled(s);

  const filteredDeals = (deals || []).filter((d) => {
    if (tab === "active") return isActive(d.status);
    if (tab === "closed") return isClosed(d.status);
    if (tab === "cancelled") return isCancelled(d.status);
    return true;
  });

  const activeCount = (deals || []).filter((d) => isActive(d.status)).length;
  const closedCount = (deals || []).filter((d) => isClosed(d.status)).length;
  const cancelledCount = (deals || []).filter((d) => isCancelled(d.status)).length;

  return (
    <div>
      <PageHeader
        eyebrow="Succession Pipeline"
        title="Active"
        titleAccent="deals"
        subtitle="Deals activate automatically upon mutual NDA completion. Track negotiations, schedule meetings, and advance milestones."
      />

      <section className="px-[4%] md:px-[2%] pb-24">
        <div className="max-w-[1200px] mx-auto">
          {/* Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All Deals", count: (deals || []).length },
                { id: "active", label: "In Progress", count: activeCount },
                { id: "closed", label: "Closed", count: closedCount },
                { id: "cancelled", label: "Cancelled", count: cancelledCount },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border transition-colors cursor-pointer ${
                    tab === t.id
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label} ({t.count})
                </button>
              ))}
            </div>

            <Link
              to="/meetings"
              className="font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center gap-1.5"
            >
              <CalendarDays size={13} /> View Meetings
            </Link>
          </div>

          {deals === null ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-secondary animate-pulse rounded-sm" />
              ))}
            </div>
          ) : filteredDeals.length === 0 ? (
            <EmptyState
              title={tab === "all" ? "No deals yet." : `No ${tab} deals right now.`}
              subtitle="When both buyer and seller complete an NDA, an active deal will open here automatically."
              icon={KeyRound}
              action="Explore Businesses"
              actionTo="/businesses"
            />
          ) : (
            <div className="space-y-6">
              {filteredDeals.map((d) => {
                const isBuyer = user?.id === d.buyer || user?.id === d.buyer_id;
                const counterpart = isBuyer
                  ? d.seller_name || d.seller_username
                  : d.buyer_name || d.buyer_username;
                const counterpartRole = isBuyer ? "Seller" : "Buyer";
                const isExpanded = !!expandedHistory[d.id];
                const isContactsExpanded = !!expandedContacts[d.id];
                const historyList = d.status_history || [];

                return (
                  <div
                    key={d.id}
                    className="border border-border p-6 md:p-8 rounded-sm bg-background transition-shadow hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-6">
                      {/* Business & Counterpart Info */}
                      <div className="flex gap-5 min-w-0">
                        {d.business_featured_image ? (
                          <div className="w-20 h-20 overflow-hidden bg-secondary rounded-sm shrink-0">
                            <img
                              src={d.business_featured_image}
                              alt={d.business_title || "Business"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 bg-secondary rounded-sm shrink-0 flex items-center justify-center font-display text-2xl text-muted-foreground/40">
                            {(d.business_title || "B").charAt(0)}
                          </div>
                        )}

                        <div className="min-w-0">
                          <h3 className="font-display text-lg font-light text-foreground">
                            {d.business_id ? (
                              <Link
                                to={`/business/${d.business_id}`}
                                className="hover:text-accent transition-colors inline-flex items-center gap-1.5"
                              >
                                {d.business_title || "Business Acquisition"}
                                <ExternalLink size={12} className="text-muted-foreground" />
                              </Link>
                            ) : (
                              d.business_title || "Business Acquisition"
                            )}
                          </h3>

                          <p className="font-body text-xs text-muted-foreground mt-1">
                            {d.business?.city ? `${d.business.city} · ` : ""}
                            {d.business_asking_price ? `Asking ${formatINR(d.business_asking_price)} · ` : ""}
                            Opened {formatDate(d.created_at)}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-body text-foreground/80">
                            <span>
                              <strong className="text-muted-foreground">{counterpartRole}:</strong>{" "}
                              {counterpart || "—"}
                            </span>
                            {d.nda && (
                              <Link
                                to={`/nda/${d.nda}`}
                                className="text-accent underline underline-offset-2 inline-flex items-center gap-1"
                              >
                                <FileText size={11} /> View Mutual NDA
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Management */}
                      <div className="flex flex-col sm:items-end gap-3 shrink-0">
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] tracking-label uppercase text-muted-foreground">
                            Status:
                          </span>
                          <span
                            className={`font-body text-[10px] tracking-label uppercase px-3 py-1.5 rounded-full border ${
                              STATUS_COLOR_MAP[d.status] || "border-border text-muted-foreground"
                            }`}
                          >
                            {STATUS_DISPLAY_MAP[d.status] || d.status}
                          </span>
                        </div>

                        {/* Status dropdown */}
                        <div className="flex items-center gap-2">
                          <span className="font-body text-[10px] tracking-label uppercase text-muted-foreground hidden sm:inline">
                            Update:
                          </span>
                          <select
                            value={d.status}
                            onChange={(e) => openStatusChange(d, e.target.value)}
                            disabled={updatingId === d.id}
                            aria-label="Update Deal Status"
                            className="bg-transparent border border-border rounded-full px-4 py-1.5 font-body text-xs text-foreground focus:outline-none focus:border-accent cursor-pointer disabled:opacity-50"
                          >
                            {PERMITTED_DEAL_STATUSES.map((s) => (
                              <option key={s.value} value={s.value} className="bg-background text-foreground">
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Toolbar */}
                    <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => navigate(`/meetings?deal_id=${d.id}`)}
                          className="font-body text-xs tracking-label uppercase px-4 py-2 rounded-full border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <CalendarDays size={12} /> Schedule Meeting
                        </button>

                        {d.meeting_count > 0 && (
                          <button
                            onClick={() => navigate(`/meetings?deal_id=${d.id}`)}
                            className="font-body text-xs tracking-label uppercase px-4 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            Meetings ({d.meeting_count})
                          </button>
                        )}

                        {/* Mutual Contact Sharing Toggle Button */}
                        <button
                          type="button"
                          onClick={() => toggleContacts(d.id)}
                          className={`font-body text-xs tracking-label uppercase px-4 py-2 rounded-full border transition-colors inline-flex items-center gap-1.5 cursor-pointer ${
                            d.contact_exchange?.status === "shared"
                              ? "border-emerald-500/40 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/50"
                              : d.contact_exchange?.status === "pending"
                              ? "border-amber-500/40 text-amber-700 bg-amber-50/50 hover:bg-amber-100/50"
                              : "border-border text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <Users size={12} />
                          <span>
                            {d.contact_exchange?.status === "shared"
                              ? "Contacts Shared"
                              : d.contact_exchange?.status === "pending"
                              ? (d.contact_exchange?.is_initiator ? "Contact Pending" : "Respond to Contact Request")
                              : "Mutual Contact Sharing"}
                          </span>
                          {isContactsExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>

                      {/* Timeline toggle */}
                      {historyList.length > 0 && (
                        <button
                          onClick={() => toggleHistory(d.id)}
                          className="font-body text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <History size={13} />
                          <span>Status History ({historyList.length})</span>
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      )}
                    </div>

                    {/* Mutual Contact Sharing Container */}
                    {isContactsExpanded && (
                      <div className="mt-5 pt-4 border-t border-border/60">
                        <MutualContactSharing
                          dealId={d.id}
                          deal={d}
                          initialExchange={d.contact_exchange}
                          onUpdate={load}
                        />
                      </div>
                    )}

                    {/* Status History Timeline */}
                    {isExpanded && historyList.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-border/60 bg-secondary/30 p-4 rounded-sm">
                        <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-3 flex items-center gap-1.5">
                          <History size={11} /> Timestamped Status History
                        </p>
                        <div className="space-y-3">
                          {historyList.map((h) => (
                            <div key={h.id} className="flex items-start gap-3 text-xs font-body">
                              <span className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-foreground">
                                  <span className="font-medium">
                                    {STATUS_DISPLAY_MAP[h.to_status] || h.to_status}
                                  </span>{" "}
                                  <span className="text-muted-foreground">
                                    by {h.changed_by_name || "User"}
                                  </span>
                                </p>
                                {h.note && (
                                  <p className="text-muted-foreground mt-0.5 italic">"{h.note}"</p>
                                )}
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {formatDate(h.created_at)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Status Change Confirmation Modal */}
      {statusModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setStatusModal(null);
          }}
        >
          <div className="bg-background border border-border rounded-modal w-full max-w-md max-w-[calc(100vw-32px)] p-6 sm:p-7 relative shadow-2xl max-h-[85vh] overflow-y-auto my-auto flex flex-col">
            <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-1">
              Deal Progression
            </p>
            <h3 className="font-display text-xl font-light text-foreground mb-3">
              Update Deal Status
            </h3>

            <p className="font-body text-xs text-muted-foreground mb-4 break-words">
              Moving status to{" "}
              <strong className="text-accent">
                {STATUS_DISPLAY_MAP[statusModal.newStatus] || statusModal.newStatus}
              </strong>{" "}
              for "{statusModal.deal.business_title || "Business"}".
            </p>

            <div className="mb-5">
              <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
                Status Note / Reason <span className="normal-case">(Optional — recorded in timeline)</span>
              </label>
              <textarea
                rows={3}
                value={statusModal.note}
                onChange={(e) =>
                  setStatusModal((prev) => ({ ...prev, note: e.target.value }))
                }
                placeholder="e.g. Completed initial walkthrough, preparing valuation proposal…"
                className="w-full bg-transparent border border-border p-3 rounded-lg font-body text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 mt-auto pt-2">
              <button
                type="button"
                onClick={() => setStatusModal(null)}
                className="font-body text-xs tracking-label uppercase px-5 py-2.5 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusChange}
                disabled={updatingId === statusModal.deal.id}
                className="font-body text-xs tracking-label uppercase px-6 py-2.5 rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {updatingId === statusModal.deal.id ? "Saving…" : "Confirm Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
