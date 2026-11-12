import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Phone,
  Mail,
  Copy,
  Check,
  AlertCircle,
  Clock,
  XCircle,
  ShieldCheck,
  User,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/lib/ToastContext";
import { contactService } from "@/services/contactService";
import { formatDate } from "@/lib/format";

export default function MutualContactSharing({
  dealId,
  ndaId,
  deal,
  initialExchange = null,
  onUpdate,
  compact = false,
}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [exchange, setExchange] = useState(initialExchange);
  const [loading, setLoading] = useState(!initialExchange && (!!dealId || !!ndaId));
  const [busy, setBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState(null);

  // Decline modal state
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");

  // Check current user profile completeness
  const userEmail = (user?.email || "").trim();
  const userPhone = (user?.phone_number || user?.phone || "").trim();
  const isProfileComplete = Boolean(userEmail && userPhone);

  const loadStatus = async () => {
    try {
      if (dealId) {
        const res = await contactService.getByDeal(dealId);
        setExchange(res.data?.exchange || null);
      } else if (ndaId) {
        const res = await contactService.getStatus(ndaId);
        setExchange(res.data?.exchange || null);
      }
    } catch (err) {
      // 404 or none is normal if not requested yet
      setExchange(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialExchange) {
      setExchange(initialExchange);
    } else if (dealId || ndaId) {
      loadStatus();
    }
  }, [dealId, ndaId, initialExchange]);

  const handleCopy = (text, key) => {
    if (!text || text === "Not specified") return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    toast({ description: `Copied to clipboard: ${text}` });
    setTimeout(() => {
      setCopiedKey(null);
    }, 2500);
  };

  // Request Contact Exchange
  const handleRequestExchange = async () => {
    if (!isProfileComplete) {
      toast({
        description:
          "Please update your profile with your mobile number before requesting contact exchange.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      const payload = dealId ? { deal_id: dealId } : { nda_id: ndaId };
      const res = await contactService.request(payload);
      setExchange(res.data?.exchange || res.data);
      toast({
        description: "Contact exchange request sent to the counterpart.",
      });
      onUpdate?.();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Could not send contact exchange request.";
      toast({ description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Accept Contact Exchange
  const handleAccept = async () => {
    if (!exchange?.id) return;
    if (!isProfileComplete) {
      toast({
        description:
          "Please update your profile with your mobile number before accepting contact exchange.",
        variant: "destructive",
      });
      return;
    }

    setBusy(true);
    try {
      const res = await contactService.accept(exchange.id);
      setExchange(res.data?.exchange || res.data);
      toast({
        description: "Contact details are now mutually unlocked for both parties!",
      });
      onUpdate?.();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Could not accept contact exchange.";
      toast({ description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Decline Contact Exchange
  const handleDeclineConfirm = async () => {
    if (!exchange?.id) return;
    setBusy(true);
    try {
      const res = await contactService.decline(exchange.id, declineReason.trim());
      setExchange(res.data?.exchange || res.data);
      setShowDeclineModal(false);
      setDeclineReason("");
      toast({
        description: "Contact exchange request declined. Contact details remain confidential.",
      });
      onUpdate?.();
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Could not decline contact exchange.";
      toast({ description: msg, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Status determinations
  const status = exchange?.status || "none";
  const isInitiator = exchange?.is_initiator || (exchange?.initiated_by && user && exchange.initiated_by === user.id);
  const userHasConsented = exchange?.user_has_consented;
  const isShared = status === "shared" && exchange?.contact_details;
  const isPending = status === "pending";
  const isDeclined = status === "declined";
  const businessTitle = exchange?.business_title || deal?.business_title || "the business";
  const requesterName = exchange?.requester_name || exchange?.initiated_by_name || "Counterpart";

  return (
    <div className="border border-border p-6 md:p-8 bg-background rounded-modal relative">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6 pb-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
            <Users size={18} strokeWidth={1.5} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-display text-lg font-light text-foreground">
                Mutual Contact Sharing
              </h4>
              {isShared && (
                <span className="font-body text-[10px] tracking-label uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/30 text-emerald-600 bg-emerald-50/50 flex items-center gap-1">
                  <ShieldCheck size={11} /> Unlocked
                </span>
              )}
              {isPending && (
                <span className="font-body text-[10px] tracking-label uppercase px-2.5 py-0.5 rounded-full border border-amber-500/30 text-amber-600 bg-amber-50/50 flex items-center gap-1">
                  <Clock size={11} /> Pending Consent
                </span>
              )}
              {isDeclined && (
                <span className="font-body text-[10px] tracking-label uppercase px-2.5 py-0.5 rounded-full border border-border text-muted-foreground">
                  Declined
                </span>
              )}
            </div>
            <p className="font-body text-xs text-muted-foreground mt-0.5">
              Email addresses and direct mobile numbers remain strictly confidential until both parties explicitly agree to connect.
            </p>
          </div>
        </div>
      </div>

      {/* Profile Incomplete Warning Banner */}
      {!isProfileComplete && (
        <div className="mb-6 p-4 rounded-lg border border-amber-500/30 bg-amber-50/50 text-amber-900 flex items-start gap-3 text-xs font-body">
          <AlertCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-medium text-amber-950">Profile contact information required</p>
            <p className="mt-0.5 text-amber-800">
              Your profile is missing {!userPhone ? "your mobile phone number" : "your email address"}. Please update your profile before exchanging contact details with the other party.
            </p>
            <Link
              to="/profile"
              className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-amber-950 underline underline-offset-2 hover:text-black"
            >
              Update Profile Now <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="py-6 text-center text-xs font-body text-muted-foreground animate-pulse">
          Loading contact exchange status…
        </div>
      )}

      {!loading && (
        <div>
          {/* ── STATE 1: No request yet (or previously cancelled) ── */}
          {(status === "none" || status === "cancelled") && (
            <div className="bg-secondary/20 p-5 rounded-lg border border-border/60">
              <p className="font-body text-xs text-muted-foreground mb-4">
                Neither party has requested direct contact exchange yet. Requesting contact exchange invites the other participant to mutually exchange verified email addresses and phone numbers.
              </p>
              <button
                type="button"
                onClick={handleRequestExchange}
                disabled={busy}
                className="font-body text-xs tracking-label uppercase px-5 py-2.5 rounded-full border border-accent bg-accent text-accent-foreground hover:bg-accent/90 transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Phone size={13} />
                <span>{busy ? "Requesting…" : "Request Contact Exchange"}</span>
              </button>
            </div>
          )}

          {/* ── STATE 2: Pending — User is the INITIATOR ── */}
          {isPending && isInitiator && (
            <div className="bg-amber-500/5 p-5 rounded-lg border border-amber-500/20">
              <div className="flex items-start gap-3">
                <Clock size={16} className="text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="font-body text-sm text-foreground font-medium">
                    Contact Exchange Requested
                  </p>
                  <p className="font-body text-xs text-muted-foreground mt-1">
                    You have requested to exchange contact details. We have notified the other party and are waiting for their explicit consent.
                  </p>
                  <p className="font-body text-[11px] text-muted-foreground mt-2">
                    Direct phone numbers and emails will unlock automatically once accepted.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ── STATE 3: Pending — User is the RECEIVER (Action required) ── */}
          {isPending && !isInitiator && (
            <div className="bg-secondary/40 p-5 rounded-lg border border-accent/40">
              <p className="font-body text-xs tracking-label uppercase text-accent font-semibold mb-1">
                Action Required
              </p>
              <h5 className="font-display text-base text-foreground font-medium mb-1">
                {requesterName} wants to exchange contact details
              </h5>
              <p className="font-body text-xs text-muted-foreground mb-4">
                {requesterName} has requested to exchange direct email and mobile numbers for <strong>"{businessTitle}"</strong>. By accepting, your verified email and phone number will be shared with them, and theirs will be unlocked for you.
              </p>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={busy}
                  className="font-body text-xs tracking-label uppercase px-5 py-2.5 rounded-full border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Check size={13} />
                  <span>{busy ? "Unlocking…" : "Accept & Exchange Contacts"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(true)}
                  disabled={busy}
                  className="font-body text-xs tracking-label uppercase px-4 py-2.5 rounded-full border border-border text-muted-foreground hover:text-destructive hover:border-destructive transition-colors cursor-pointer disabled:opacity-50"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* ── STATE 4: Declined ── */}
          {isDeclined && (
            <div className="bg-secondary/20 p-5 rounded-lg border border-border">
              <div className="flex items-start gap-3 mb-3">
                <XCircle size={16} className="text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="font-body text-sm font-medium text-foreground">
                    Contact Exchange Declined
                  </p>
                  <p className="font-body text-xs text-muted-foreground mt-0.5">
                    {exchange?.declined_by_name
                      ? `${exchange.declined_by_name} declined the contact exchange request.`
                      : "The contact exchange request was declined."}{" "}
                    Contact numbers and email addresses remain strictly private.
                  </p>
                  {exchange?.decline_reason && (
                    <p className="font-body text-xs text-foreground/80 mt-2 bg-secondary/40 p-2.5 rounded-md italic">
                      "{exchange.decline_reason}"
                    </p>
                  )}
                </div>
              </div>

              {/* Sensible Retry Rule: Either party can initiate a new request */}
              <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-4">
                <p className="font-body text-[11px] text-muted-foreground">
                  If discussions have advanced, you can request contact exchange again:
                </p>
                <button
                  type="button"
                  onClick={handleRequestExchange}
                  disabled={busy}
                  className="font-body text-xs tracking-label uppercase px-4 py-2 rounded-full border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                >
                  {busy ? "Requesting…" : "Request Again"}
                </button>
              </div>
            </div>
          )}

          {/* ── STATE 5: MUTUALLY SHARED (Unlocked Contact Cards) ── */}
          {isShared && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center gap-2.5 text-xs text-emerald-800 font-body">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0" />
                <span>
                  <strong>Mutual consent verified:</strong> Direct contact details have been unlocked for both buyer and seller.
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
                {/* ── Buyer Contact Card ── */}
                <div className="border border-border rounded-xl p-5 bg-secondary/15 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
                      <span className="font-body text-[10px] tracking-label uppercase text-accent font-semibold flex items-center gap-1.5">
                        <User size={12} /> Buyer Contact
                      </span>
                    </div>

                    <h5 className="font-display text-lg text-foreground font-light mb-3">
                      {exchange.contact_details.buyer?.name || "Buyer"}
                    </h5>

                    {/* Email */}
                    <div className="mb-3">
                      <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-1">
                        Email Address
                      </p>
                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/80">
                        <span className="font-body text-xs text-foreground truncate select-all">
                          {exchange.contact_details.buyer?.email || "—"}
                        </span>
                        {exchange.contact_details.buyer?.email && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(exchange.contact_details.buyer.email, "buyer-email")
                            }
                            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Copy email address"
                            aria-label="Copy buyer email"
                          >
                            {copiedKey === "buyer-email" ? (
                              <Check size={14} className="text-emerald-600" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-1">
                        Mobile Number
                      </p>
                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/80">
                        <span className="font-body text-xs text-foreground truncate select-all">
                          {exchange.contact_details.buyer?.phone || "Not specified"}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {exchange.contact_details.buyer?.phone && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(exchange.contact_details.buyer.phone, "buyer-phone")
                              }
                              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Copy mobile number"
                              aria-label="Copy buyer mobile number"
                            >
                              {copiedKey === "buyer-phone" ? (
                                <Check size={14} className="text-emerald-600" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          )}
                          {exchange.contact_details.buyer?.phone && exchange.contact_details.buyer.phone !== "Not specified" && (
                            <a
                              href={`tel:${exchange.contact_details.buyer.phone}`}
                              className="p-1 rounded text-accent hover:text-foreground transition-colors"
                              title="Call buyer"
                              aria-label="Call buyer"
                            >
                              <Phone size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Seller Contact Card ── */}
                <div className="border border-border rounded-xl p-5 bg-secondary/15 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-3">
                      <span className="font-body text-[10px] tracking-label uppercase text-accent font-semibold flex items-center gap-1.5">
                        <User size={12} /> Seller Contact
                      </span>
                    </div>

                    <h5 className="font-display text-lg text-foreground font-light mb-3">
                      {exchange.contact_details.seller?.name || "Seller"}
                    </h5>

                    {/* Email */}
                    <div className="mb-3">
                      <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-1">
                        Email Address
                      </p>
                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/80">
                        <span className="font-body text-xs text-foreground truncate select-all">
                          {exchange.contact_details.seller?.email || "—"}
                        </span>
                        {exchange.contact_details.seller?.email && (
                          <button
                            type="button"
                            onClick={() =>
                              handleCopy(exchange.contact_details.seller.email, "seller-email")
                            }
                            className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            title="Copy email address"
                            aria-label="Copy seller email"
                          >
                            {copiedKey === "seller-email" ? (
                              <Check size={14} className="text-emerald-600" />
                            ) : (
                              <Copy size={14} />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Mobile Number */}
                    <div>
                      <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-1">
                        Mobile Number
                      </p>
                      <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-background border border-border/80">
                        <span className="font-body text-xs text-foreground truncate select-all">
                          {exchange.contact_details.seller?.phone || "Not specified"}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          {exchange.contact_details.seller?.phone && (
                            <button
                              type="button"
                              onClick={() =>
                                handleCopy(exchange.contact_details.seller.phone, "seller-phone")
                              }
                              className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                              title="Copy mobile number"
                              aria-label="Copy seller mobile number"
                            >
                              {copiedKey === "seller-phone" ? (
                                <Check size={14} className="text-emerald-600" />
                              ) : (
                                <Copy size={14} />
                              )}
                            </button>
                          )}
                          {exchange.contact_details.seller?.phone && exchange.contact_details.seller.phone !== "Not specified" && (
                            <a
                              href={`tel:${exchange.contact_details.seller.phone}`}
                              className="p-1 rounded text-accent hover:text-foreground transition-colors"
                              title="Call seller"
                              aria-label="Call seller"
                            >
                              <Phone size={14} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Decline Confirmation Modal */}
      {showDeclineModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeclineModal(false);
          }}
        >
          <div className="bg-background border border-border rounded-modal w-full max-w-md max-w-[calc(100vw-32px)] p-6 sm:p-7 relative shadow-2xl max-h-[85vh] overflow-y-auto my-auto flex flex-col">
            <h4 className="font-display text-xl font-light text-foreground mb-3">
              Decline Contact Sharing
            </h4>
            <p className="font-body text-xs text-muted-foreground mb-4 break-words">
              Direct contact details will not be exchanged and your phone and email remain private. You can provide an optional reason below:
            </p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g. Prefer to continue discussions through the platform or after scheduled site visit…"
              className="w-full bg-transparent border border-border p-3 rounded-lg font-body text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent mb-5"
            />
            <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 mt-auto pt-2">
              <button
                type="button"
                onClick={() => setShowDeclineModal(false)}
                className="font-body text-xs tracking-label uppercase px-4 py-2 rounded-full border border-border text-muted-foreground hover:text-foreground cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleDeclineConfirm}
                disabled={busy}
                className="font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border border-destructive text-destructive hover:bg-destructive/10 cursor-pointer disabled:opacity-50"
              >
                {busy ? "Declining…" : "Confirm Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
