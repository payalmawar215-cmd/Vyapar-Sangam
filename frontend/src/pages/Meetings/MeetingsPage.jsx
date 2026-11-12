import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  CalendarDays, Video, MapPin, Clock, Check, X, RotateCcw,
  CheckCircle2, Plus, AlertCircle, ExternalLink, History, ChevronDown, ChevronUp
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/lib/ToastContext";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import { meetingService } from "@/services/meetingService";
import { formatDate } from "@/lib/format";

const STATUS_DISPLAY = {
  requested: "Requested",
  accepted: "Accepted",
  confirmed: "Confirmed",
  reschedule_proposed: "Reschedule Proposed",
  rescheduled: "Rescheduled",
  rejected: "Declined",
  cancelled: "Cancelled",
  completed: "Completed",
};

const STATUS_COLOR = {
  requested: "border-amber-400 text-amber-700 bg-amber-50/50",
  accepted: "border-accent text-accent bg-accent/5",
  confirmed: "border-accent text-accent bg-accent/5",
  reschedule_proposed: "border-orange-500 text-orange-700 bg-orange-50/50",
  rescheduled: "border-blue-500 text-blue-700 bg-blue-50/50",
  rejected: "border-destructive/40 text-destructive bg-destructive/5",
  cancelled: "border-border text-muted-foreground/60",
  completed: "border-emerald-600 text-emerald-700 bg-emerald-50",
};

export default function MeetingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialDealId = searchParams.get("deal_id") || searchParams.get("deal");

  const [meetings, setMeetings] = useState(null);
  const [eligibleDeals, setEligibleDeals] = useState([]);
  const [tab, setTab] = useState("all");
  const [busyAction, setBusyAction] = useState(null);
  const [expandedHistory, setExpandedHistory] = useState({});

  // Modals
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [acceptModal, setAcceptModal] = useState(null); // { meeting, useAlternative, link, location, note }
  const [rescheduleModal, setRescheduleModal] = useState(null); // { meeting, date, time, reason }
  const [rejectModal, setRejectModal] = useState(null); // { meeting, reason }
  const [cancelModal, setCancelModal] = useState(null); // { meeting, reason }

  // New Meeting Form state
  const [formDealId, setFormDealId] = useState(initialDealId || "");
  const [formType, setFormType] = useState("online");
  const [formPrefDate, setFormPrefDate] = useState("");
  const [formPrefTime, setFormPrefTime] = useState("11:00");
  const [formAltDate, setFormAltDate] = useState("");
  const [formAltTime, setFormAltTime] = useState("15:00");
  const [formPurpose, setFormPurpose] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [submittingForm, setSubmittingForm] = useState(false);

  const loadMeetings = async () => {
    try {
      const res = await meetingService.getAll();
      const items = Array.isArray(res.data) ? res.data : res.data.results || [];
      setMeetings(items);
    } catch {
      setMeetings([]);
    }
  };

  const loadEligibleDeals = async () => {
    try {
      const res = await meetingService.getEligibleDeals();
      const items = Array.isArray(res.data) ? res.data : res.data.results || [];
      setEligibleDeals(items);
      if (initialDealId && items.some((d) => String(d.id) === String(initialDealId))) {
        setFormDealId(initialDealId);
        setShowRequestModal(true);
      }
    } catch {
      setEligibleDeals([]);
    }
  };

  useEffect(() => {
    if (user) {
      loadMeetings();
      loadEligibleDeals();
    }
  }, [user]);

  const toggleHistory = (meetingId) => {
    setExpandedHistory((prev) => ({ ...prev, [meetingId]: !prev[meetingId] }));
  };

  // Submit new meeting request
  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    if (!formDealId) {
      toast({ description: "Please select an active deal for this meeting.", variant: "destructive" });
      return;
    }
    if (!formPrefDate) {
      toast({ description: "Please select a preferred meeting date.", variant: "destructive" });
      return;
    }

    setSubmittingForm(true);
    try {
      await meetingService.create({
        deal_id: Number(formDealId),
        meeting_type: formType,
        preferred_date: formPrefDate,
        preferred_time: formPrefTime ? `${formPrefTime}:00` : "10:00:00",
        alternative_date: formAltDate || null,
        alternative_time: formAltDate ? (formAltTime ? `${formAltTime}:00` : "14:00:00") : null,
        purpose: formPurpose.trim(),
        online_meeting_link: formType === "online" ? formLink.trim() : "",
        site_visit_location: formType === "site_visit" ? formLocation.trim() : "",
      });

      toast({ description: "Meeting request submitted. The other party has been notified." });
      setShowRequestModal(false);
      // Reset form
      setFormPurpose("");
      setFormPrefDate("");
      setFormAltDate("");
      setFormLink("");
      setFormLocation("");
      await loadMeetings();
    } catch (err) {
      const errMsg =
        err?.response?.data?.detail ||
        err?.response?.data?.error ||
        err?.response?.data?.preferred_date?.[0] ||
        (typeof err?.response?.data === "string" ? err.response.data : "Could not submit meeting request.");
      toast({ description: errMsg, variant: "destructive" });
    } finally {
      setSubmittingForm(false);
    }
  };

  // Seller accepts meeting
  const handleAcceptConfirm = async () => {
    if (!acceptModal) return;
    const { meeting, useAlternative, link, location, note } = acceptModal;
    setBusyAction(meeting.id + "accept");
    try {
      await meetingService.accept(meeting.id, {
        use_alternative: useAlternative,
        online_meeting_link: link.trim(),
        site_visit_location: location.trim(),
        message: note.trim(),
      });
      toast({ description: "Meeting accepted and confirmed." });
      setAcceptModal(null);
      await loadMeetings();
    } catch (err) {
      toast({ description: err?.response?.data?.error || "Could not accept meeting.", variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  // Seller proposes reschedule
  const handleRescheduleConfirm = async () => {
    if (!rescheduleModal) return;
    const { meeting, date, time, reason } = rescheduleModal;
    if (!date || !time) {
      toast({ description: "Please enter both reschedule date and time.", variant: "destructive" });
      return;
    }
    setBusyAction(meeting.id + "reschedule");
    try {
      await meetingService.proposeReschedule(meeting.id, {
        reschedule_date: date,
        reschedule_time: `${time}:00`,
        reason: reason.trim(),
      });
      toast({ description: "Reschedule proposal sent to the buyer." });
      setRescheduleModal(null);
      await loadMeetings();
    } catch (err) {
      toast({ description: err?.response?.data?.error || "Could not propose reschedule.", variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  // Buyer accepts reschedule
  const handleAcceptReschedule = async (meeting) => {
    setBusyAction(meeting.id + "accept-reschedule");
    try {
      await meetingService.acceptReschedule(meeting.id);
      toast({ description: "Rescheduled meeting confirmed." });
      await loadMeetings();
    } catch (err) {
      toast({ description: err?.response?.data?.error || "Could not accept reschedule.", variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  // Seller rejects meeting
  const handleRejectConfirm = async () => {
    if (!rejectModal) return;
    const { meeting, reason } = rejectModal;
    setBusyAction(meeting.id + "reject");
    try {
      await meetingService.reject(meeting.id, reason.trim());
      toast({ description: "Meeting request declined." });
      setRejectModal(null);
      await loadMeetings();
    } catch (err) {
      toast({ description: err?.response?.data?.error || "Could not decline meeting.", variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  // Cancel meeting
  const handleCancelConfirm = async () => {
    if (!cancelModal) return;
    const { meeting, reason } = cancelModal;
    setBusyAction(meeting.id + "cancel");
    try {
      await meetingService.cancel(meeting.id, reason.trim());
      toast({ description: "Meeting cancelled." });
      setCancelModal(null);
      await loadMeetings();
    } catch (err) {
      toast({ description: err?.response?.data?.error || "Could not cancel meeting.", variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  // Complete meeting
  const handleComplete = async (meeting) => {
    setBusyAction(meeting.id + "complete");
    try {
      await meetingService.complete(meeting.id);
      toast({ description: "Meeting marked as completed." });
      await loadMeetings();
    } catch (err) {
      toast({ description: err?.response?.data?.error || "Could not mark as completed.", variant: "destructive" });
    } finally {
      setBusyAction(null);
    }
  };

  // Filter logic
  const filteredMeetings = (meetings || []).filter((m) => {
    if (tab === "requested") return m.status === "requested";
    if (tab === "confirmed") return ["confirmed", "accepted", "rescheduled"].includes(m.status);
    if (tab === "reschedule_proposed") return m.status === "reschedule_proposed";
    if (tab === "completed") return m.status === "completed";
    if (tab === "cancelled") return ["cancelled", "rejected"].includes(m.status);
    return true;
  });

  const countPending = (meetings || []).filter((m) => m.status === "requested").length;
  const countConfirmed = (meetings || []).filter((m) => ["confirmed", "accepted", "rescheduled"].includes(m.status)).length;
  const countReschedule = (meetings || []).filter((m) => m.status === "reschedule_proposed").length;
  const countCompleted = (meetings || []).filter((m) => m.status === "completed").length;

  return (
    <div>
      <PageHeader
        eyebrow="Succession Schedule"
        title="Meetings &"
        titleAccent="site visits"
        subtitle="Schedule online video calls or in-person facility inspections for your active acquisition deals."
      />

      <section className="px-[4%] md:px-[2%] pb-24">
        <div className="max-w-[1200px] mx-auto">
          {/* Header Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
            <div className="flex flex-wrap gap-2">
              {[
                { id: "all", label: "All Meetings", count: (meetings || []).length },
                { id: "requested", label: "Pending", count: countPending },
                { id: "confirmed", label: "Confirmed", count: countConfirmed },
                { id: "reschedule_proposed", label: "Reschedule Proposed", count: countReschedule },
                { id: "completed", label: "Completed", count: countCompleted },
                { id: "cancelled", label: "Cancelled", count: (meetings || []).length - countPending - countConfirmed - countReschedule - countCompleted },
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

            <button
              onClick={() => {
                if (eligibleDeals.length === 0) {
                  toast({
                    description: "You have no active deals eligible for meetings yet. Complete an NDA to start a deal.",
                    variant: "destructive",
                  });
                  return;
                }
                setShowRequestModal(true);
              }}
              className="font-body text-xs tracking-label uppercase px-6 py-2.5 rounded-full border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
            >
              <Plus size={14} /> Request a Meeting
            </button>
          </div>

          {meetings === null ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-32 bg-secondary animate-pulse rounded-sm" />
              ))}
            </div>
          ) : filteredMeetings.length === 0 ? (
            <EmptyState
              title={tab === "all" ? "No meetings scheduled yet." : `No ${tab} meetings found.`}
              subtitle="Meetings are scheduled directly between buyers and sellers for active deals."
              icon={CalendarDays}
              action={eligibleDeals.length > 0 ? "Request Meeting" : "View Active Deals"}
              actionTo={eligibleDeals.length > 0 ? undefined : "/deals"}
              onClick={eligibleDeals.length > 0 ? () => setShowRequestModal(true) : undefined}
            />
          ) : (
            <div className="space-y-6">
              {filteredMeetings.map((m) => {
                const isSeller = user?.id === m.seller;
                const isBuyer = user?.id === m.buyer;
                const counterpartName = isSeller ? m.buyer_name : m.seller_name;
                const counterpartRole = isSeller ? "Buyer" : "Seller";
                const isExpanded = !!expandedHistory[m.id];
                const historyList = m.status_history || [];

                return (
                  <div
                    key={m.id}
                    className="border border-border p-6 md:p-8 rounded-sm bg-background transition-shadow hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-6">
                      {/* Main Meeting Details */}
                      <div className="flex gap-4 items-start min-w-0">
                        <div className="p-3 bg-secondary rounded-full shrink-0 text-accent">
                          {m.meeting_type === "online" ? <Video size={18} /> : <MapPin size={18} />}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-body text-[10px] tracking-label uppercase text-muted-foreground">
                              {m.meeting_type === "online" ? "Online Video Meeting" : "Business Site Visit"}
                            </span>
                            {m.deal_id && (
                              <Link
                                to="/deals"
                                className="font-body text-[10px] tracking-label uppercase text-accent hover:underline inline-flex items-center gap-1"
                              >
                                Deal #{m.deal_id} <ExternalLink size={10} />
                              </Link>
                            )}
                          </div>

                          <h3 className="font-display text-lg font-light text-foreground mt-1">
                            {m.business_title || "Business"}
                          </h3>

                          <p className="font-body text-xs text-muted-foreground mt-1">
                            {counterpartRole}: <strong className="text-foreground">{counterpartName || "—"}</strong> ·
                            Requested by {m.created_by_name || (m.is_buyer ? "Buyer" : "Seller")} on{" "}
                            {formatDate(m.created_at)}
                          </p>

                          {m.purpose && (
                            <p className="font-body text-xs text-foreground/80 mt-2 bg-secondary/40 p-2.5 rounded-sm italic">
                              "{m.purpose}"
                            </p>
                          )}

                          {/* Time Slots info */}
                          <div className="mt-3 space-y-1.5 text-xs font-body">
                            {m.preferred_date && (
                              <p className="text-foreground flex items-center gap-2">
                                <Clock size={12} className="text-muted-foreground shrink-0" />
                                <span>
                                  <strong>Requested Slot:</strong> {m.preferred_date}{" "}
                                  {m.preferred_time ? `at ${m.preferred_time.slice(0, 5)}` : ""}
                                </span>
                              </p>
                            )}

                            {m.alternative_date && !m.confirmed_date && (
                              <p className="text-muted-foreground flex items-center gap-2">
                                <Clock size={12} className="text-muted-foreground shrink-0" />
                                <span>
                                  Alternative: {m.alternative_date}{" "}
                                  {m.alternative_time ? `at ${m.alternative_time.slice(0, 5)}` : ""}
                                </span>
                              </p>
                            )}

                            {m.confirmed_date && ["confirmed", "accepted", "rescheduled"].includes(m.status) && (
                              <p className="text-accent font-medium flex items-center gap-2">
                                <CheckCircle2 size={13} className="shrink-0" />
                                <span>
                                  Confirmed Slot: {m.confirmed_date}{" "}
                                  {m.confirmed_time ? `at ${m.confirmed_time.slice(0, 5)}` : ""}
                                </span>
                              </p>
                            )}

                            {m.reschedule_date && m.status === "reschedule_proposed" && (
                              <p className="text-orange-700 font-medium flex items-center gap-2">
                                <RotateCcw size={13} className="shrink-0" />
                                <span>
                                  Seller proposed new time: {m.reschedule_date}{" "}
                                  {m.reschedule_time ? `at ${m.reschedule_time.slice(0, 5)}` : ""}
                                  {m.reschedule_reason ? ` (${m.reschedule_reason})` : ""}
                                </span>
                              </p>
                            )}

                            {m.online_meeting_link && ["confirmed", "accepted", "rescheduled"].includes(m.status) && (
                              <p className="text-xs">
                                <a
                                  href={m.online_meeting_link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-accent underline underline-offset-2 inline-flex items-center gap-1 font-medium"
                                >
                                  Join Video Meeting ↗
                                </a>
                              </p>
                            )}

                            {m.site_visit_location && (
                              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                                <MapPin size={12} className="mt-0.5 text-accent shrink-0" />
                                <span>Location: {m.site_visit_location}</span>
                              </p>
                            )}

                            {m.rejection_reason && m.status === "rejected" && (
                              <p className="text-xs text-destructive flex items-start gap-1.5">
                                <AlertCircle size={12} className="mt-0.5 shrink-0" />
                                <span>Decline note: {m.rejection_reason}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`font-body text-[10px] tracking-label uppercase px-3 py-1.5 rounded-full border shrink-0 ${
                          STATUS_COLOR[m.status] || "border-border text-muted-foreground"
                        }`}
                      >
                        {STATUS_DISPLAY[m.status] || m.status}
                      </span>
                    </div>

                    {/* Action Buttons Row */}
                    <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center justify-between gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Seller Actions when REQUESTED */}
                        {isSeller && m.status === "requested" && (
                          <>
                            <button
                              onClick={() =>
                                setAcceptModal({
                                  meeting: m,
                                  useAlternative: false,
                                  link: m.online_meeting_link || "",
                                  location: m.site_visit_location || "",
                                  note: "",
                                })
                              }
                              className="font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Check size={12} /> Accept Meeting
                            </button>

                            <button
                              onClick={() =>
                                setRescheduleModal({
                                  meeting: m,
                                  date: m.preferred_date || "",
                                  time: "14:00",
                                  reason: "",
                                })
                              }
                              className="font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <RotateCcw size={12} /> Propose New Time
                            </button>

                            <button
                              onClick={() => setRejectModal({ meeting: m, reason: "" })}
                              className="font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <X size={12} /> Decline
                            </button>
                          </>
                        )}

                        {/* Buyer Actions when RESCHEDULE_PROPOSED */}
                        {isBuyer && m.status === "reschedule_proposed" && (
                          <>
                            <button
                              onClick={() => handleAcceptReschedule(m)}
                              disabled={busyAction === m.id + "accept-reschedule"}
                              className="font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <Check size={12} /> Accept New Time
                            </button>

                            <button
                              onClick={() => setCancelModal({ meeting: m, reason: "" })}
                              className="font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <X size={12} /> Decline &amp; Cancel
                            </button>
                          </>
                        )}

                        {/* Actions when CONFIRMED/ACCEPTED */}
                        {["confirmed", "accepted", "rescheduled"].includes(m.status) && (
                          <>
                            <button
                              onClick={() => handleComplete(m)}
                              disabled={busyAction === m.id + "complete"}
                              className="font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border border-green-600 text-green-700 hover:bg-green-50 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                            >
                              <CheckCircle2 size={12} /> Mark Completed
                            </button>

                            <button
                              onClick={() => setCancelModal({ meeting: m, reason: "" })}
                              className="font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              Cancel Meeting
                            </button>
                          </>
                        )}

                        {/* Buyer can cancel when pending requested */}
                        {isBuyer && m.status === "requested" && (
                          <button
                            onClick={() => setCancelModal({ meeting: m, reason: "" })}
                            className="font-body text-xs tracking-label uppercase px-4 py-2 rounded-full border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            Withdraw Request
                          </button>
                        )}
                      </div>

                      {/* History timeline toggle */}
                      {historyList.length > 0 && (
                        <button
                          onClick={() => toggleHistory(m.id)}
                          className="font-body text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <History size={13} />
                          <span>History ({historyList.length})</span>
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                      )}
                    </div>

                    {/* Timeline section */}
                    {isExpanded && historyList.length > 0 && (
                      <div className="mt-5 pt-4 border-t border-border/60 bg-secondary/30 p-4 rounded-sm">
                        <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-3 flex items-center gap-1.5">
                          <History size={11} /> Meeting Event Log
                        </p>
                        <div className="space-y-2.5">
                          {historyList.map((h) => (
                            <div key={h.id} className="flex items-start gap-3 text-xs font-body">
                              <span className="w-2 h-2 rounded-full bg-accent mt-1.5 shrink-0" />
                              <div className="min-w-0">
                                <p className="text-foreground">
                                  <span className="font-medium">{STATUS_DISPLAY[h.to_status] || h.to_status}</span>{" "}
                                  <span className="text-muted-foreground">by {h.changed_by_name || "User"}</span>
                                </p>
                                {h.note && <p className="text-muted-foreground italic mt-0.5">"{h.note}"</p>}
                                <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(h.created_at)}</p>
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

      {/* ── MODAL 1: Request Meeting Modal (Buyer / Seller) ── */}
      {showRequestModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRequestModal(false);
          }}
        >
          <div className="bg-background border border-border rounded-modal w-full max-w-lg max-w-[calc(100vw-32px)] p-6 md:p-8 relative shadow-2xl max-h-[85vh] overflow-y-auto my-auto flex flex-col">
            <button
              onClick={() => setShowRequestModal(false)}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-1">
              Acquisition Meeting
            </p>
            <h3 className="font-display text-2xl font-light text-foreground mb-6">
              Request a Meeting
            </h3>

            <form onSubmit={handleCreateMeeting} className="space-y-5">
              {/* Deal Picker */}
              <div>
                <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
                  Select Active Deal <span className="text-destructive">*</span>
                </label>
                <select
                  value={formDealId}
                  onChange={(e) => setFormDealId(e.target.value)}
                  required
                  className="w-full bg-transparent border-b border-border pb-2 font-body text-sm text-foreground focus:outline-none focus:border-accent cursor-pointer"
                >
                  <option value="" className="bg-background text-foreground">
                    Choose an active deal…
                  </option>
                  {eligibleDeals.map((d) => (
                    <option key={d.id} value={d.id} className="bg-background text-foreground">
                      {d.business_title} ({d.counterpart_role}: {d.counterpart_name})
                    </option>
                  ))}
                </select>
              </div>

              {/* Meeting Type Selection */}
              <div>
                <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
                  Meeting Type
                </label>
                <div className="flex gap-3">
                  {[
                    ["online", "Online Meeting (Video Call)", Video],
                    ["site_visit", "Business Site Visit", MapPin],
                  ].map(([val, label, Icon]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setFormType(val)}
                      className={`flex items-center gap-2 font-body text-xs tracking-label uppercase px-4 py-2.5 rounded-full border transition-colors cursor-pointer ${
                        formType === val
                          ? "border-accent text-accent bg-accent/5 font-medium"
                          : "border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon size={13} /> {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">
                    Preferred Date <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    value={formPrefDate}
                    onChange={(e) => setFormPrefDate(e.target.value)}
                    className="w-full bg-transparent border-b border-border pb-1 font-body text-sm text-foreground focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">
                    Preferred Time <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formPrefTime}
                    onChange={(e) => setFormPrefTime(e.target.value)}
                    className="w-full bg-transparent border-b border-border pb-1 font-body text-sm text-foreground focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Alternative Slot (Optional) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">
                    Alternative Date <span className="normal-case">(Optional)</span>
                  </label>
                  <input
                    type="date"
                    min={new Date().toISOString().split("T")[0]}
                    value={formAltDate}
                    onChange={(e) => setFormAltDate(e.target.value)}
                    className="w-full bg-transparent border-b border-border pb-1 font-body text-sm text-foreground focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">
                    Alternative Time <span className="normal-case">(Optional)</span>
                  </label>
                  <input
                    type="time"
                    value={formAltTime}
                    onChange={(e) => setFormAltTime(e.target.value)}
                    className="w-full bg-transparent border-b border-border pb-1 font-body text-sm text-foreground focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              {/* Purpose / Message */}
              <div>
                <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
                  Purpose / Message <span className="normal-case text-muted-foreground">(Optional)</span>
                </label>
                <textarea
                  rows={3}
                  value={formPurpose}
                  onChange={(e) => setFormPurpose(e.target.value)}
                  placeholder="e.g. Initial founder discussion, operational review, plant walk-through…"
                  className="w-full bg-transparent border border-border p-3 rounded-lg font-body text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
                />
              </div>

              {/* Online meeting link / location */}
              {formType === "online" ? (
                <div>
                  <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">
                    Google Meet / Zoom Link <span className="normal-case">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    value={formLink}
                    onChange={(e) => setFormLink(e.target.value)}
                    placeholder="https://meet.google.com/..."
                    className="w-full bg-transparent border-b border-border pb-1 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
                  />
                </div>
              ) : (
                <div>
                  <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">
                    Site Visit Location <span className="normal-case">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g. Factory address, main office…"
                    className="w-full bg-transparent border-b border-border pb-1 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
                  />
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="font-body text-xs tracking-label uppercase px-5 py-2.5 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="font-body text-xs tracking-label uppercase px-7 py-2.5 rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {submittingForm ? "Submitting…" : "Send Meeting Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Seller Accept Modal ── */}
      {acceptModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAcceptModal(null);
          }}
        >
          <div className="bg-background border border-border rounded-modal w-full max-w-md max-w-[calc(100vw-32px)] p-6 sm:p-7 relative shadow-2xl max-h-[85vh] overflow-y-auto my-auto flex flex-col">
            <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-1">
              Seller Action
            </p>
            <h3 className="font-display text-xl font-light text-foreground mb-4">
              Confirm Meeting Request
            </h3>

            <p className="font-body text-xs text-muted-foreground mb-4 break-words">
              Confirm slot with <strong>{acceptModal.meeting.buyer_name || "the buyer"}</strong> for{" "}
              "{acceptModal.meeting.business_title}".
            </p>

            {/* Choose slot if alternative available */}
            {acceptModal.meeting.alternative_date && (
              <div className="mb-4 p-3 bg-secondary/40 rounded-lg space-y-2">
                <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground">
                  Select Time Slot
                </p>
                <label className="flex items-center gap-2 text-xs font-body cursor-pointer">
                  <input
                    type="radio"
                    name="slot_choice"
                    checked={!acceptModal.useAlternative}
                    onChange={() => setAcceptModal((prev) => ({ ...prev, useAlternative: false }))}
                  />
                  <span>
                    Primary: {acceptModal.meeting.preferred_date}{" "}
                    {acceptModal.meeting.preferred_time ? `at ${acceptModal.meeting.preferred_time.slice(0, 5)}` : ""}
                  </span>
                </label>
                <label className="flex items-center gap-2 text-xs font-body cursor-pointer">
                  <input
                    type="radio"
                    name="slot_choice"
                    checked={acceptModal.useAlternative}
                    onChange={() => setAcceptModal((prev) => ({ ...prev, useAlternative: true }))}
                  />
                  <span>
                    Alternative: {acceptModal.meeting.alternative_date}{" "}
                    {acceptModal.meeting.alternative_time ? `at ${acceptModal.meeting.alternative_time.slice(0, 5)}` : ""}
                  </span>
                </label>
              </div>
            )}

            {/* Link or Location input */}
            {acceptModal.meeting.meeting_type === "online" ? (
              <div className="mb-4">
                <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">
                  Video Call Link
                </label>
                <input
                  type="url"
                  value={acceptModal.link}
                  onChange={(e) => setAcceptModal((prev) => ({ ...prev, link: e.target.value }))}
                  placeholder="https://meet.google.com/..."
                  className="w-full bg-transparent border-b border-border pb-1 font-body text-xs text-foreground focus:outline-none focus:border-accent"
                />
              </div>
            ) : (
              <div className="mb-4">
                <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">
                  Site Visit Location / Address
                </label>
                <input
                  type="text"
                  value={acceptModal.location}
                  onChange={(e) => setAcceptModal((prev) => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. Unit 4, Industrial Area, Surat"
                  className="w-full bg-transparent border-b border-border pb-1 font-body text-xs text-foreground focus:outline-none focus:border-accent"
                />
              </div>
            )}

            <div className="mb-5">
              <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">
                Confirmation Note <span className="normal-case">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={acceptModal.note}
                onChange={(e) => setAcceptModal((prev) => ({ ...prev, note: e.target.value }))}
                placeholder="Looking forward to speaking with you…"
                className="w-full bg-transparent border border-border p-2.5 rounded-lg font-body text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 mt-auto pt-2">
              <button
                type="button"
                onClick={() => setAcceptModal(null)}
                className="font-body text-xs tracking-label uppercase px-4 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAcceptConfirm}
                className="font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 cursor-pointer"
              >
                Confirm Meeting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 3: Seller Propose Reschedule Modal ── */}
      {rescheduleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRescheduleModal(null);
          }}
        >
          <div className="bg-background border border-border rounded-modal w-full max-w-md max-w-[calc(100vw-32px)] p-6 sm:p-7 relative shadow-2xl max-h-[85vh] overflow-y-auto my-auto flex flex-col">
            <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-1">
              Propose New Time
            </p>
            <h3 className="font-display text-xl font-light text-foreground mb-4">
              Reschedule Meeting
            </h3>

            <div className="space-y-4 mb-5">
              <div>
                <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">
                  New Date <span className="text-destructive">*</span>
                </label>
                <input
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={rescheduleModal.date}
                  onChange={(e) => setRescheduleModal((prev) => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-transparent border-b border-border pb-1 font-body text-xs text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">
                  New Time <span className="text-destructive">*</span>
                </label>
                <input
                  type="time"
                  required
                  value={rescheduleModal.time}
                  onChange={(e) => setRescheduleModal((prev) => ({ ...prev, time: e.target.value }))}
                  className="w-full bg-transparent border-b border-border pb-1 font-body text-xs text-foreground focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">
                  Reason for Rescheduling
                </label>
                <input
                  type="text"
                  value={rescheduleModal.reason}
                  onChange={(e) => setRescheduleModal((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="e.g. Existing conflict at the requested slot…"
                  className="w-full bg-transparent border-b border-border pb-1 font-body text-xs text-foreground focus:outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 mt-auto pt-2">
              <button
                type="button"
                onClick={() => setRescheduleModal(null)}
                className="font-body text-xs tracking-label uppercase px-4 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRescheduleConfirm}
                className="font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 cursor-pointer"
              >
                Send Proposal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 4: Decline / Reject Modal ── */}
      {rejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setRejectModal(null);
          }}
        >
          <div className="bg-background border border-border rounded-modal w-full max-w-md max-w-[calc(100vw-32px)] p-6 sm:p-7 relative shadow-2xl max-h-[85vh] overflow-y-auto my-auto flex flex-col">
            <h3 className="font-display text-xl font-light text-foreground mb-3">
              Decline Meeting Request
            </h3>
            <p className="font-body text-xs text-muted-foreground mb-4 break-words">
              Please provide a brief reason for declining this request:
            </p>
            <textarea
              rows={3}
              value={rejectModal.reason}
              onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="e.g. Unable to host site visits at this stage of discussions…"
              className="w-full bg-transparent border border-border p-3 rounded-lg font-body text-xs text-foreground focus:outline-none focus:border-accent mb-5"
            />
            <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 mt-auto pt-2">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="font-body text-xs tracking-label uppercase px-4 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border border-destructive text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                Confirm Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 5: Cancel Modal ── */}
      {cancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setCancelModal(null);
          }}
        >
          <div className="bg-background border border-border rounded-modal w-full max-w-md max-w-[calc(100vw-32px)] p-6 sm:p-7 relative shadow-2xl max-h-[85vh] overflow-y-auto my-auto flex flex-col">
            <h3 className="font-display text-xl font-light text-foreground mb-3">
              Cancel Meeting
            </h3>
            <p className="font-body text-xs text-muted-foreground mb-4 break-words">
              Are you sure you want to cancel this meeting?
            </p>
            <input
              type="text"
              value={cancelModal.reason}
              onChange={(e) => setCancelModal((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder="Reason for cancellation (optional)"
              className="w-full bg-transparent border-b border-border pb-1 font-body text-xs text-foreground focus:outline-none focus:border-accent mb-5"
            />
            <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 mt-auto pt-2">
              <button
                type="button"
                onClick={() => setCancelModal(null)}
                className="font-body text-xs tracking-label uppercase px-4 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCancelConfirm}
                className="font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border border-destructive text-destructive hover:bg-destructive/10 cursor-pointer"
              >
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
