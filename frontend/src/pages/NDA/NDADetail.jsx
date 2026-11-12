import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, FileSignature, Check, CalendarDays, Users, Video, MapPin, Phone } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { ndaService } from "@/services/ndaService";
import { meetingService } from "@/services/meetingService";
import { contactService } from "@/services/contactService";
import { formatDate, NDA_STATUS_LABEL } from "@/lib/format";
import MutualContactSharing from "@/components/common/MutualContactSharing";

export const NDA_TERMS = [
  "All business information shared through this workflow — financials, customer data, supplier relationships, operations and pricing — is confidential.",
  "Confidential information may be used solely to evaluate the proposed acquisition of the business named above.",
  "Neither party will disclose confidential information to any third party without the prior written consent of the other party.",
  "Both parties will use reasonable care to protect confidential information from unauthorised use or disclosure.",
  "Upon conclusion of discussions, each party will return or destroy all confidential information upon request.",
  "This acknowledgement reflects a mutual understanding of confidentiality between the parties on the Vyapar Sangam platform. It is a structured workflow step, not certified legally-binding electronic signature infrastructure.",
];

function MeetingRequestForm({ ndaId, businessId, onCreated }) {
  const { toast } = useToast();
  const [type, setType] = useState("online");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [altDate, setAltDate] = useState("");
  const [altTime, setAltTime] = useState("");
  const [purpose, setPurpose] = useState("");
  const [link, setLink] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!date) { toast({ description: "Please select a preferred date.", variant: "destructive" }); return; }
    setBusy(true);
    try {
      await meetingService.create({
        nda_id: ndaId,
        meeting_type: type,
        preferred_date: date,
        preferred_time: time || "10:00:00",
        alternative_date: altDate || null,
        alternative_time: altDate ? (altTime || "10:00:00") : null,
        purpose,
        online_meeting_link: type === "online" ? link : "",
        site_visit_location: type === "site_visit" ? location : "",
      });
      toast({ description: "Meeting request sent to the seller." });
      onCreated();
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.response?.data?.error || "Could not create meeting request.";
      toast({ description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="border border-border p-5 rounded-sm space-y-4 bg-secondary/20">
      <p className="font-body text-xs tracking-label uppercase text-muted-foreground">Meeting Details</p>

      {/* Type */}
      <div className="flex gap-3">
        {[["online", "Online Meeting", Video], ["site_visit", "Site Visit", MapPin]].map(([val, label, Icon]) => (
          <button key={val} onClick={() => setType(val)}
            className={`flex items-center gap-2 font-body text-xs tracking-label uppercase px-4 py-2 rounded-full border transition-colors cursor-pointer ${type === val ? "border-accent text-accent bg-accent/5" : "border-border text-muted-foreground hover:text-foreground"}`}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {/* Preferred datetime */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">Preferred Date *</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="w-full bg-transparent border-b border-border pb-1 font-body text-sm focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">Preferred Time</label>
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            className="w-full bg-transparent border-b border-border pb-1 font-body text-sm focus:outline-none focus:border-accent" />
        </div>
      </div>

      {/* Alternative datetime */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">Alternative Date (Optional)</label>
          <input type="date" value={altDate} onChange={e => setAltDate(e.target.value)}
            className="w-full bg-transparent border-b border-border pb-1 font-body text-sm focus:outline-none focus:border-accent" />
        </div>
        <div>
          <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">Alternative Time</label>
          <input type="time" value={altTime} onChange={e => setAltTime(e.target.value)}
            className="w-full bg-transparent border-b border-border pb-1 font-body text-sm focus:outline-none focus:border-accent" />
        </div>
      </div>

      {/* Purpose */}
      <div>
        <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">Purpose (Optional)</label>
        <input type="text" value={purpose} onChange={e => setPurpose(e.target.value)}
          placeholder="e.g. Initial introduction, financial review, facility tour…"
          className="w-full bg-transparent border-b border-border pb-1 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent" />
      </div>

      {type === "online" ? (
        <div>
          <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">Meeting Link (Optional)</label>
          <input type="url" value={link} onChange={e => setLink(e.target.value)}
            placeholder="https://meet.google.com/…"
            className="w-full bg-transparent border-b border-border pb-1 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent" />
        </div>
      ) : (
        <div>
          <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-1">Location / Address (Optional)</label>
          <input type="text" value={location} onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Factory premises, 12 Industrial Estate, Surat"
            className="w-full bg-transparent border-b border-border pb-1 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent" />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button onClick={submit} disabled={busy}
          className="font-body text-xs tracking-label uppercase px-6 py-2.5 rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 transition-colors disabled:opacity-50 cursor-pointer">
          {busy ? "Sending…" : "Send Request"}
        </button>
      </div>
    </div>
  );
}

export default function NDADetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [nda, setNda] = useState(null);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);

  // Feature 4: Meetings
  const [meetings, setMeetings] = useState([]);
  const [showMeetingForm, setShowMeetingForm] = useState(false);

  // Feature 5: Contact Exchange
  const [contactExchange, setContactExchange] = useState(null);
  const [contactBusy, setContactBusy] = useState(false);

  const load = () => {
    ndaService.getById(id)
      .then((res) => setNda(res.data))
      .catch(() => setNotFound(true));
  };

  const loadMeetings = () => {
    meetingService.getAll({ nda_id: id })
      .then(res => setMeetings(Array.isArray(res.data) ? res.data : res.data.results || []))
      .catch(() => {});
  };

  const loadContactExchange = () => {
    contactService.getStatus(id)
      .then(res => setContactExchange(res.data))
      .catch(err => {
        // 404 means no exchange yet
        if (err?.response?.status === 404) setContactExchange(null);
      });
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (nda?.status === "completed") {
      loadMeetings();
      loadContactExchange();
    }
  }, [nda?.status]);

  const accept = async () => {
    setBusy(true);
    try {
      const res = await ndaService.acknowledge(id);
      const updated = res.data?.nda || res.data;
      setNda(updated);
      if (updated.status === "completed") {
        toast({ description: "NDA completed — your deal is now open." });
      } else {
        toast({ description: "Acknowledged — waiting for the other party." });
      }
    } catch {
      toast({
        description: "Could not record your acknowledgement. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  // Contact Exchange actions
  const requestContact = async () => {
    setContactBusy(true);
    try {
      const res = await contactService.request(id);
      setContactExchange(res.data);
      toast({ description: "Contact exchange request sent." });
    } catch (err) {
      toast({ description: err?.response?.data?.detail || "Could not send request.", variant: "destructive" });
    } finally { setContactBusy(false); }
  };

  const acceptContact = async () => {
    if (!contactExchange?.id) return;
    setContactBusy(true);
    try {
      const res = await contactService.accept(contactExchange.id);
      setContactExchange(res.data);
      toast({ description: "Contact details are now shared with both parties." });
    } catch (err) {
      toast({ description: err?.response?.data?.detail || "Could not accept.", variant: "destructive" });
    } finally { setContactBusy(false); }
  };

  const declineContact = async () => {
    if (!contactExchange?.id) return;
    setContactBusy(true);
    try {
      const res = await contactService.decline(contactExchange.id);
      setContactExchange(res.data);
      toast({ description: "Contact exchange declined." });
    } catch (err) {
      toast({ description: err?.response?.data?.detail || "Could not decline.", variant: "destructive" });
    } finally { setContactBusy(false); }
  };

  const cancelContact = async () => {
    if (!contactExchange?.id) return;
    setContactBusy(true);
    try {
      const res = await contactService.cancel(contactExchange.id);
      setContactExchange(res.data);
      toast({ description: "Contact exchange request cancelled." });
    } catch (err) {
      toast({ description: err?.response?.data?.detail || "Could not cancel.", variant: "destructive" });
    } finally { setContactBusy(false); }
  };

  if (notFound) {
    return (
      <div className="pt-40 pb-24 text-center">
        <p className="font-body text-sm text-muted-foreground">NDA not found.</p>
        <Link to="/nda" className="ghost-btn text-xs mt-8 inline-block">
          Back to NDAs
        </Link>
      </div>
    );
  }

  if (!nda) {
    return (
      <div className="pt-32 pb-24 px-[4%]">
        <div className="max-w-3xl mx-auto h-96 bg-secondary animate-pulse rounded" />
      </div>
    );
  }

  const isBuyer = user?.id === nda.buyer || user?.id === nda.buyer_id;
  const isSeller = user?.id === nda.seller || user?.id === nda.seller_id;
  const myAck = isBuyer ? nda.buyer_accepted : isSeller ? nda.seller_accepted : false;
  const canAct = (isBuyer || isSeller) && !myAck && nda.status !== "completed";
  const isCompleted = nda.status === "completed";

  // Contact exchange state helpers
  const myUserId = user?.id;
  const ceInitiatorId = contactExchange?.initiator || contactExchange?.initiator_id;
  const ceIAmInitiator = ceInitiatorId && myUserId && String(ceInitiatorId) === String(myUserId);
  const ceStatus = contactExchange?.status;
  const ceNeedsMyConsent = contactExchange && !ceIAmInitiator && ceStatus === "pending";

  return (
    <div className="pt-20 md:pt-24 pb-24 md:pb-32">
      <div className="px-[4%] md:px-[2%]">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/nda"
            className="inline-flex items-center gap-2 font-body text-xs tracking-label uppercase text-muted-foreground hover:text-foreground transition-colors mb-10"
          >
            <ArrowLeft size={14} /> All NDAs
          </Link>

          {/* NDA Card */}
          <div className="border border-border p-8 md:p-14">
            <div className="text-center pb-10 border-b border-border">
              <FileSignature size={22} strokeWidth={1.25} className="text-accent mx-auto mb-5" />
              <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground">
                Mutual Non-Disclosure Acknowledgement
              </p>
              <h1 className="font-display text-display-md font-light mt-3">
                {nda.business_title || nda.business?.name || "Business"}
              </h1>
              <p className="font-body text-xs text-muted-foreground mt-2">
                Opened {formatDate(nda.created_at || nda.created_date)}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-10 border-b border-border">
              <div>
                <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-1">Buyer</p>
                <p className="font-body text-sm text-foreground">{nda.buyer_name || nda.buyer_username || "—"}</p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  {nda.buyer_accepted
                    ? `Acknowledged ${formatDate(nda.buyer_accepted_at || nda.buyer_accepted_date)}`
                    : "Not yet acknowledged"}
                </p>
              </div>
              <div>
                <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-1">Seller</p>
                <p className="font-body text-sm text-foreground">{nda.seller_name || nda.seller_username || "—"}</p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  {nda.seller_accepted
                    ? `Acknowledged ${formatDate(nda.seller_accepted_at || nda.seller_accepted_date)}`
                    : "Not yet acknowledged"}
                </p>
              </div>
            </div>

            <div className="py-10 border-b border-border">
              <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-6">Confidentiality Terms</p>
              <ol className="space-y-5">
                {NDA_TERMS.map((t, i) => (
                  <li key={i} className="flex gap-4">
                    <span className="font-display text-lg font-light text-accent/70 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="font-body text-sm text-foreground/80 leading-relaxed">{t}</p>
                  </li>
                ))}
              </ol>
            </div>

            <div className="pt-10">
              <div className="flex items-center justify-between mb-8">
                <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground">Status</p>
                <span className={`font-body text-[10px] tracking-label uppercase px-3 py-1.5 rounded-full border ${
                  nda.status === "completed" ? "border-accent text-accent" : "border-border text-muted-foreground"
                }`}>
                  {NDA_STATUS_LABEL[nda.status] || nda.status}
                </span>
              </div>

              {isCompleted ? (
                <div className="flex flex-col items-center gap-4">
                  <p className="font-body text-sm text-foreground flex items-center gap-2">
                    <Check size={15} className="text-accent" /> Both parties have acknowledged the NDA.
                  </p>
                  <Link to="/deals" className="ghost-btn text-xs">Go to Deals</Link>
                </div>
              ) : canAct ? (
                <div>
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={agreed}
                      onChange={(e) => setAgreed(e.target.checked)}
                      className="mt-1 w-4 h-4 accent-[#8a6a3f]"
                    />
                    <span className="font-body text-sm text-foreground">
                      I acknowledge and agree to the NDA terms.
                    </span>
                  </label>
                  <button
                    onClick={accept}
                    disabled={!agreed || busy}
                    className="w-full mt-8 text-xs px-8 py-4 font-body tracking-widest uppercase rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 transition-all duration-500 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Accept NDA
                  </button>
                </div>
              ) : (
                <p className="font-body text-sm text-muted-foreground">
                  {myAck
                    ? `You have acknowledged the NDA. Waiting for the ${isBuyer ? "seller" : "buyer"} to acknowledge.`
                    : "Waiting for the other party's acknowledgement."}
                </p>
              )}
            </div>
          </div>

          {/* ── Post-NDA Sections (only when completed) ── */}
          {isCompleted && (
            <>
              {/* Feature 4: Meeting Scheduler */}
              <div className="mt-8 border border-border p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={18} strokeWidth={1.25} className="text-accent" />
                    <div>
                      <p className="font-body text-xs tracking-label uppercase text-accent">Meeting &amp; Site Visit</p>
                      <p className="font-body text-xs text-muted-foreground mt-0.5">
                        Schedule an online call or in-person site visit.
                      </p>
                    </div>
                  </div>
                  {isBuyer && !showMeetingForm && (
                    <button
                      onClick={() => setShowMeetingForm(true)}
                      className="font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <CalendarDays size={12} /> Request Meeting
                    </button>
                  )}
                </div>

                {showMeetingForm && (
                  <MeetingRequestForm
                    ndaId={id}
                    businessId={nda.business || nda.business_id}
                    onCreated={() => { setShowMeetingForm(false); loadMeetings(); }}
                  />
                )}

                {meetings.length > 0 ? (
                  <div className="space-y-4 mt-4">
                    {meetings.map(m => (
                      <div key={m.id} className="border border-border/60 p-4 rounded-sm flex items-start justify-between gap-4">
                        <div className="flex gap-3 items-start">
                          {m.meeting_type === "online" ? <Video size={14} className="text-accent mt-0.5 shrink-0" /> : <MapPin size={14} className="text-accent mt-0.5 shrink-0" />}
                          <div>
                            <p className="font-body text-sm text-foreground">
                              {m.meeting_type === "online" ? "Online Meeting" : "Site Visit"}
                            </p>
                            {m.preferred_date && (
                              <p className="font-body text-xs text-muted-foreground mt-0.5">
                                {m.preferred_date}{m.preferred_time ? ` at ${m.preferred_time.slice(0, 5)}` : ""}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className={`font-body text-[10px] tracking-label uppercase px-2.5 py-1 rounded-full border shrink-0 ${
                          m.status === "accepted" ? "border-accent text-accent" :
                          m.status === "rejected" ? "border-destructive/40 text-destructive" :
                          "border-border text-muted-foreground"
                        }`}>
                          {m.status === "requested" ? "Pending" : m.status === "accepted" ? "Confirmed" : m.status === "reschedule_proposed" ? "Reschedule Proposed" : m.status}
                        </span>
                      </div>
                    ))}
                    <Link to="/meetings" className="font-body text-xs text-accent hover:underline underline-offset-2">
                      Manage all meetings →
                    </Link>
                  </div>
                ) : (
                  !showMeetingForm && (
                    <p className="font-body text-xs text-muted-foreground">
                      No meetings scheduled yet.{isBuyer ? " Click 'Request Meeting' to get started." : " The buyer will request a meeting."}
                    </p>
                  )
                )}
              </div>

              {/* Feature 5: Mutual Contact Sharing */}
              <div className="mt-6">
                <MutualContactSharing ndaId={id} deal={nda.deal} onUpdate={load} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
