import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Store, Pencil, Trash2, Send, RotateCcw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/lib/ToastContext";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import { listingService } from "@/services/listingService";
import { formatINR, formatDate } from "@/lib/format";

const STATUS_LABEL = {
  draft: "Draft",
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  changes_required: "Changes Required",
};
const TABS = ["all", "draft", "pending", "approved", "rejected", "changes_required"];

export default function MyListingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState(null);
  const [tab, setTab] = useState("all");

  const load = async () => {
    try {
      const res = await listingService.getMyListings();
      const items = Array.isArray(res.data) ? res.data : res.data.results || [];
      setListings(items);
    } catch {
      setListings([]);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const submitDraft = async (b) => {
    try {
      await listingService.update(b.id, { status: "pending", rejection_reason: "" });
      toast({ description: `${b.name || b.title} submitted for approval.` });
      load();
    } catch {
      toast({ description: "Could not submit listing.", variant: "destructive" });
    }
  };

  const resubmit = async (b) => {
    try {
      await listingService.resubmit(b.id, "Corrections made as per reviewer feedback.");
      toast({ description: `${b.name || b.title} resubmitted for approval.` });
      load();
    } catch {
      toast({ description: "Could not resubmit listing.", variant: "destructive" });
    }
  };

  const remove = async (b) => {
    if (!window.confirm(`Delete "${b.name || b.title}"? This cannot be undone.`)) return;
    try {
      await listingService.delete(b.id);
      toast({ description: "Listing deleted." });
      load();
    } catch {
      toast({ description: "Could not delete listing.", variant: "destructive" });
    }
  };

  const filtered = (listings || []).filter((b) => tab === "all" || b.status === tab);

  return (
    <div>
      <PageHeader
        eyebrow="Seller"
        title="My"
        titleAccent="listings"
        subtitle="Every listing you own — drafts, items under review, live listings and rejections, with clear next steps."
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
            <Link
              to="/add-business"
              className="font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors ml-auto inline-flex items-center gap-2"
            >
              <Store size={13} /> Add Business
            </Link>
          </div>

          {listings === null ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-secondary animate-pulse rounded" />)}</div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="You haven't listed a business yet."
              subtitle={tab === "all" ? "Create your first listing and begin the succession journey." : `You have no ${STATUS_LABEL[tab]?.toLowerCase()} listings right now.`}
              action="Add Business"
              actionTo="/add-business"
              icon={Store}
            />
          ) : (
            <div className="divide-y divide-border border-t border-b border-border">
              {filtered.map((b) => (
                <div key={b.id} className="py-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-5 min-w-0">
                    <div className="w-16 h-16 overflow-hidden bg-secondary shrink-0">
                      {(b.featured_image || b.images?.[0]) ? (
                        <img src={b.featured_image || b.images[0]} alt={b.name || b.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-display text-xl text-muted-foreground/40">
                          {(b.name || b.title)?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="font-body text-sm text-foreground truncate">{b.name || b.title}</p>
                      <p className="font-body text-xs text-muted-foreground mt-0.5">
                        {b.category_name || b.category} · {b.city || b.location} · {formatINR(b.asking_price)} · added {formatDate(b.created_at || b.created_date)}
                      </p>
                      {(b.status === "rejected" || b.status === "changes_required") && b.rejection_reason && (
                        <p className="font-body text-xs text-destructive mt-1">Reviewer note: {b.rejection_reason}</p>
                      )}
                      {(b.status === "rejected" || b.status === "changes_required") && b.rejection_feedback && (
                        <p className="font-body text-xs text-destructive/80 mt-0.5">{b.rejection_feedback}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-body text-[10px] tracking-label uppercase px-3 py-1.5 rounded-full border ${
                      b.status === "approved" ? "border-accent text-accent" :
                      b.status === "rejected" ? "border-destructive/40 text-destructive" :
                      b.status === "changes_required" ? "border-orange-400/60 text-orange-600" :
                      "border-border text-muted-foreground"
                    }`}>
                      {STATUS_LABEL[b.status] || b.status}
                    </span>
                    {b.status === "draft" && (
                      <button onClick={() => submitDraft(b)} aria-label="Submit for approval" className="p-2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer" title="Submit for approval">
                        <Send size={14} />
                      </button>
                    )}
                    {(b.status === "draft" || b.status === "rejected" || b.status === "changes_required") && (
                      <Link to={`/business/${b.id}/edit`} aria-label="Edit listing" className="p-2 text-muted-foreground hover:text-foreground transition-colors" title="Edit">
                        <Pencil size={14} />
                      </Link>
                    )}
                    {(b.status === "rejected" || b.status === "changes_required") && (
                      <button onClick={() => resubmit(b)} aria-label="Resubmit for approval" className="p-2 text-muted-foreground hover:text-accent transition-colors cursor-pointer" title="Resubmit for approval">
                        <RotateCcw size={14} />
                      </button>
                    )}
                    <button onClick={() => remove(b)} aria-label="Delete listing" className="p-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer" title="Delete">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
