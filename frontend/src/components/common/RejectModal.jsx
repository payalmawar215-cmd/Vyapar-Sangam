import { useState } from "react";
import { X } from "lucide-react";

const REJECTION_REASONS = [
  "Incomplete business information",
  "Unclear or missing photographs",
  "Incorrect or unverifiable financial details",
  "Supporting documents required",
  "Ownership information needs clarification",
  "Duplicate listing",
  "Other",
];

/**
 * RejectModal — inline rejection dialog used by Admin pages.
 * Props:
 *   listing    — the listing being rejected (for display)
 *   onConfirm  — fn(reason, feedback, status) called when admin confirms
 *   onClose    — fn() called when modal is dismissed
 */
export default function RejectModal({ listing, onConfirm, onClose }) {
  const [reason, setReason] = useState("Incomplete business information");
  const [feedback, setFeedback] = useState("");
  const [status, setStatus] = useState("rejected");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    await onConfirm(reason, feedback.trim(), status);
    setBusy(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background border border-border rounded-modal shadow-2xl w-full max-w-lg max-w-[calc(100vw-32px)] p-6 sm:p-8 relative max-h-[85vh] overflow-y-auto my-auto flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-1">Admin Action</p>
        <h2 className="font-display text-xl sm:text-2xl font-light mb-6">Reject listing</h2>

        {listing && (
          <p className="font-body text-sm text-foreground mb-6 pb-5 border-b border-border break-words">
            <span className="font-medium">{listing.name}</span>
            {listing.city ? ` · ${listing.city}` : ""}
          </p>
        )}

        {/* Action type */}
        <div className="mb-5">
          <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground mb-3">Rejection Type</p>
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={() => setStatus("rejected")}
              className={`font-body text-xs tracking-label uppercase px-4 py-2 rounded-full border transition-colors cursor-pointer ${
                status === "rejected"
                  ? "border-destructive text-destructive bg-destructive/5"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Rejected (Final)
            </button>
            <button
              type="button"
              onClick={() => setStatus("changes_required")}
              className={`font-body text-xs tracking-label uppercase px-4 py-2 rounded-full border transition-colors cursor-pointer ${
                status === "changes_required"
                  ? "border-orange-400 text-orange-600 bg-orange-50"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Changes Required
            </button>
          </div>
          <p className="font-body text-[11px] text-muted-foreground mt-2">
            {status === "rejected"
              ? "Listing is rejected. Seller can still edit and resubmit."
              : "Seller must make specific changes and resubmit."}
          </p>
        </div>

        {/* Reason */}
        <div className="mb-5">
          <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
            Reason <span className="text-destructive">*</span>
          </label>
          <select
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full bg-transparent border-b border-border pb-2 font-body text-sm text-foreground focus:outline-none focus:border-accent cursor-pointer"
          >
            {REJECTION_REASONS.map((r) => (
              <option key={r} value={r} className="bg-background">{r}</option>
            ))}
          </select>
        </div>

        {/* Detailed feedback */}
        <div className="mb-6">
          <label className="font-body text-[10px] tracking-label uppercase text-muted-foreground block mb-2">
            Detailed Feedback <span className="normal-case text-muted-foreground">(Optional — shared with the seller)</span>
          </label>
          <textarea
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Explain what the seller needs to fix or clarify…"
            className="w-full bg-transparent border border-border p-3 rounded-lg font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 sm:gap-3 mt-auto pt-2">
          <button
            type="button"
            onClick={onClose}
            className="font-body text-xs tracking-label uppercase px-5 py-2.5 rounded-full border border-border text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !reason}
            className="font-body text-xs tracking-label uppercase px-6 py-2.5 rounded-full border border-destructive/60 text-destructive hover:bg-destructive/5 transition-colors disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
          >
            {busy ? "Saving…" : status === "rejected" ? "Confirm Rejection" : "Request Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
