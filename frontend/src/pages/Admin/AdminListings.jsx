import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Store, Trash2, Check, X, BadgeCheck } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import RejectModal from "@/components/common/RejectModal";
import { formatINR, formatDate } from "@/lib/format";
import { listingService } from "@/services/listingService";

const STATUS_LABEL = {
  draft: "Draft",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  changes_required: "Changes Required",
};
const TABS = ["all", "draft", "pending", "approved", "rejected", "changes_required"];

export default function AdminListings() {
  const { toast } = useToast();
  const [listings, setListings] = useState(null);
  const [tab, setTab] = useState("all");
  const [rejectTarget, setRejectTarget] = useState(null); // listing being rejected

  const load = async () => {
    try {
      const res = await listingService.getAll({ limit: 200 });
      const items = Array.isArray(res.data) ? res.data : res.data.results || [];
      setListings(items);
    } catch (e) {
      setListings([]);
    }
  };

  useEffect(() => { load(); }, []);

  const approve = async (b) => {
    try {
      await listingService.approve(b.id);
      toast({ description: "Listing approved and published." });
      load();
    } catch {
      toast({ description: "Could not approve this listing.", variant: "destructive" });
    }
  };

  const handleRejectConfirm = async (reason, feedback, status) => {
    if (!rejectTarget) return;
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
    }
  };

  const remove = async (b) => {
    if (!window.confirm(`Delete "${b.name}" permanently?`)) return;
    try {
      await listingService.delete(b.id);
      toast({ description: "Listing deleted." });
      load();
    } catch {
      toast({ description: "Could not delete this listing.", variant: "destructive" });
    }
  };

  const filtered = (listings || []).filter((b) => tab === "all" || b.status === tab);

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="All"
        titleAccent="listings"
        subtitle="Every business listing on the platform, in every state. Only approved listings are publicly visible."
      />
      <section className="px-[4%] md:px-[2%] pb-24">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-wrap gap-2 mb-12">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border transition-colors cursor-pointer ${
                  tab === t ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "all" ? "All" : STATUS_LABEL[t]}
              </button>
            ))}
          </div>

          {listings === null ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-secondary animate-pulse rounded" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState title="No listings here yet." subtitle="Listings will appear as sellers create them." icon={Store} />
          ) : (
            <div className="divide-y divide-border border-t border-b border-border">
              {filtered.map((b) => (
                <div key={b.id} className="py-5 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="w-14 h-14 overflow-hidden bg-secondary shrink-0">
                      {(b.featured_image || b.images?.[0]) ? (
                        <img src={b.featured_image || b.images[0]} alt={b.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-display text-lg text-muted-foreground/40">{b.name?.charAt(0)}</div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-body text-sm text-foreground truncate flex items-center gap-2">
                        <Link to={`/business/${b.id}`} className="hover:text-accent transition-colors">{b.name}</Link>
                        {b.is_verified && <BadgeCheck size={14} className="text-accent shrink-0" title="Verified Business" />}
                      </p>
                      <p className="font-body text-xs text-muted-foreground mt-0.5">
                        {b.category_name || b.category} · {b.city || b.location} · {formatINR(b.asking_price)} · by {b.owner_name || b.created_by || "Seller"} · {formatDate(b.created_at || b.created_date)}
                      </p>
                      {(b.status === "rejected" || b.status === "changes_required") && b.rejection_reason && (
                        <p className="font-body text-xs text-destructive/80 mt-1">Reason: {b.rejection_reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`font-body text-[10px] tracking-label uppercase px-3 py-1.5 rounded-full border ${
                      b.status === "approved" ? "border-accent text-accent" :
                      b.status === "rejected" ? "border-destructive/40 text-destructive" :
                      b.status === "changes_required" ? "border-orange-400/60 text-orange-600" :
                      "border-border text-muted-foreground"
                    }`}>
                      {STATUS_LABEL[b.status] || b.status}
                    </span>
                    {b.status === "pending" && (
                      <>
                        <button
                          onClick={() => approve(b)}
                          aria-label="Approve"
                          className="p-2 rounded-full border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                          title="Approve"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => setRejectTarget(b)}
                          aria-label="Reject"
                          className="p-2 rounded-full border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors cursor-pointer"
                          title="Reject"
                        >
                          <X size={14} />
                        </button>
                      </>
                    )}
                    {b.status === "approved" && (
                      <button
                        onClick={() => setRejectTarget(b)}
                        className="font-body text-[10px] tracking-label uppercase text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                      >
                        Unpublish
                      </button>
                    )}
                    <button onClick={() => remove(b)} aria-label="Delete" className="p-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer" title="Delete">
                      <Trash2 size={14} />
                    </button>
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
