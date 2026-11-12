import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Check, X } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import RejectModal from "@/components/common/RejectModal";
import { formatINR, formatDate } from "@/lib/format";
import { listingService } from "@/services/listingService";

export default function AdminPending() {
  const { toast } = useToast();
  const [pending, setPending] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  const load = async () => {
    try {
      const res = await listingService.getAll({ status: "pending", limit: 100 });
      const items = Array.isArray(res.data) ? res.data : res.data.results || [];
      setPending(items);
    } catch {
      setPending([]);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (b) => {
    setBusyId(b.id);
    try {
      await listingService.approve(b.id);
      toast({ description: "Listing approved and published." });
      load();
    } catch {
      toast({ description: "Could not approve this listing.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const handleRejectConfirm = async (reason, feedback, status) => {
    if (!rejectTarget) return;
    setBusyId(rejectTarget.id);
    try {
      await listingService.reject(rejectTarget.id, reason, feedback, status);
      toast({
        description: status === "changes_required"
          ? "Changes requested — seller notified."
          : "Listing rejected — seller notified.",
      });
      setRejectTarget(null);
      load();
    } catch {
      toast({ description: "Could not reject this listing.", variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Pending"
        titleAccent="approvals"
        subtitle="Submitted listings waiting for verification. Approve to publish, or reject with structured feedback the seller can act on."
      />
      <section className="px-[4%] md:px-[2%] pb-24">
        <div className="max-w-[1400px] mx-auto">
          {pending === null ? (
            <div className="space-y-4">{[...Array(2)].map((_, i) => <div key={i} className="h-16 bg-secondary animate-pulse rounded" />)}</div>
          ) : pending.length === 0 ? (
            <EmptyState
              title="No pending listings."
              subtitle="You're all caught up. New submissions will queue here for review."
              icon={Clock}
            />
          ) : (
            <div className="space-y-6">
              {pending.map((b) => (
                <div key={b.id} className="border border-border p-6 md:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-6">
                    <div className="flex gap-5 min-w-0">
                      <div className="w-20 h-20 overflow-hidden bg-secondary shrink-0">
                        {(b.featured_image || b.images?.[0]) ? (
                          <img src={b.featured_image || b.images[0]} alt={b.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-display text-2xl text-muted-foreground/40">{b.name?.charAt(0)}</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-body text-sm text-foreground">
                          <Link to={`/business/${b.id}`} className="hover:text-accent transition-colors">{b.name}</Link>
                        </p>
                        <p className="font-body text-xs text-muted-foreground mt-1">
                          {b.category_name || b.category} · {b.city || b.location} · {formatINR(b.asking_price)}
                        </p>
                        <p className="font-body text-xs text-muted-foreground mt-1">
                          Submitted by {b.owner_name || b.created_by || "Seller"} on {formatDate(b.created_at || b.created_date)}
                        </p>
                        {b.short_description && (
                          <p className="font-body text-sm text-foreground/70 mt-3 max-w-xl">{b.short_description}</p>
                        )}
                        {/* Handover info preview */}
                        {b.training_provided && (
                          <p className="font-body text-xs text-accent mt-2">
                            ✓ Seller offers transition training
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => approve(b)}
                        disabled={busyId === b.id}
                        className="font-body text-xs tracking-label uppercase px-6 py-2.5 rounded-full border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                      >
                        <Check size={13} /> Approve
                      </button>
                      <button
                        onClick={() => setRejectTarget(b)}
                        disabled={busyId === b.id}
                        className="font-body text-xs tracking-label uppercase px-6 py-2.5 rounded-full border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors disabled:opacity-50 inline-flex items-center gap-2 cursor-pointer"
                      >
                        <X size={13} /> Reject
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {rejectTarget && (
        <RejectModal
          listing={rejectTarget}
          onConfirm={handleRejectConfirm}
          onClose={() => setRejectTarget(null)}
        />
      )}
    </div>
  );
}
