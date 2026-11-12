import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Handshake, Check, X, Mail, FileText } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/lib/ToastContext";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import requestService from "@/services/requestService";
import { formatDate, REQUEST_STATUS_LABEL } from "@/lib/format";

const TAB_LIST = ["all", "pending", "accepted", "rejected", "cancelled"];

export default function InterestRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState(null);
  const [tab, setTab] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [responseNote, setResponseNote] = useState({});

  const role = user?.app_role || user?.role?.toLowerCase();
  const isSeller = role === "seller";
  const isAdmin = role === "admin" || user?.role === "ADMIN" || user?.is_staff;

  const load = async () => {
    try {
      const res = await requestService.getAll();
      setRequests(res.data || []);
    } catch {
      setRequests([]);
    }
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const viewSignature = (r) => {
    const url = r.signature_file || r.signature_file_url || r.signature_file_uri;
    if (url) {
      window.open(url, "_blank", "noopener");
    } else {
      toast({ description: "Could not open the signature file.", variant: "destructive" });
    }
  };

  const respond = async (r, status) => {
    setBusyId(r.id);
    try {
      if (status === "accepted") {
        await requestService.accept(r.id, responseNote[r.id] || "");
      } else {
        await requestService.reject(r.id, responseNote[r.id] || "");
      }
      toast({
        description: status === "accepted" ? "Request accepted — NDA created." : "Request declined.",
      });
      load();
    } catch (err) {
      const msg = err?.response?.data?.error || "Could not update the request. Please try again.";
      toast({ description: msg, variant: "destructive" });
    } finally {
      setBusyId(null);
    }
  };

  const filtered = (requests || []).filter((r) => tab === "all" || r.status === tab);

  return (
    <div>
      <PageHeader
        eyebrow={isSeller ? "Seller" : isAdmin ? "Admin" : "Buyer"}
        title="Interest"
        titleAccent="requests"
        subtitle={
          isSeller
            ? "Buyers who expressed interest in your listings. Accept to open the NDA step, or decline politely."
            : isAdmin
            ? "All interest and contact requests across the marketplace."
            : "Requests you've sent to sellers, with their live status."
        }
      />
      <section className="px-[4%] md:px-[2%] pb-24">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-wrap gap-2 mb-12">
            {TAB_LIST.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border transition-colors ${
                  tab === t
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "all" ? "All" : REQUEST_STATUS_LABEL[t] || t}
              </button>
            ))}
          </div>

          {requests === null ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-secondary animate-pulse rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No interest requests yet."
              subtitle={
                isSeller
                  ? "When buyers discover your approved listings, their requests will appear here."
                  : "Explore the marketplace and express interest in a business to get started."
              }
              action={isSeller ? undefined : "Explore Businesses"}
              actionTo={isSeller ? undefined : "/businesses"}
              icon={isSeller ? Handshake : Mail}
            />
          ) : (
            <div className="divide-y divide-border border-t border-b border-border">
              {filtered.map((r) => (
                <div key={r.id} className="py-6 flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-body text-sm text-foreground">
                      {r.listing_id || r.listing ? (
                        <Link
                          to={`/business/${r.listing || r.listing_id}`}
                          className="hover:text-accent transition-colors"
                        >
                          {r.listing_title || r.business_title || "Business"}
                        </Link>
                      ) : (
                        r.listing_title || r.business_title || "Business"
                      )}
                    </p>
                    <p className="font-body text-xs text-muted-foreground mt-1">
                      {isSeller
                        ? `From ${r.buyer_name || r.buyer_username || "Buyer"}`
                        : "To seller"}
                      {" · "}
                      {r.request_type === "contact" ? "Contact request" : "Interest"}
                      {" · "}
                      {formatDate(r.created_at || r.created_date)}
                    </p>
                    {r.message && (
                      <p className="font-body text-sm text-foreground/70 mt-2 italic">
                        "{r.message}"
                      </p>
                    )}
                    {r.purpose && (
                      <p className="font-body text-sm text-foreground/70 mt-2">
                        Purpose: {r.purpose}
                      </p>
                    )}
                    {isSeller && (r.buyer_name || r.buyer_email || r.buyer_phone) && (
                      <p className="font-body text-xs text-muted-foreground mt-1">
                        Buyer: {r.buyer_name || "—"}
                        {r.buyer_email ? ` · ${r.buyer_email}` : ""}
                        {r.buyer_phone ? ` · ${r.buyer_phone}` : ""}
                      </p>
                    )}
                    {r.nda_version && (
                      <p className="font-body text-xs text-muted-foreground mt-1">
                        NDA {r.nda_version}
                        {r.nda_accepted_at ? ` · accepted ${formatDate(r.nda_accepted_at)}` : ""}
                        {r.decision_date && r.status !== "pending" ? ` · decided ${formatDate(r.decision_date)}` : ""}
                      </p>
                    )}
                    {isSeller && (r.signature_file || r.signature_file_url || r.signature_file_uri) && (
                      <button
                        onClick={() => viewSignature(r)}
                        className="font-body text-xs text-accent hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        <FileText size={12} /> View buyer signature
                      </button>
                    )}
                    {r.seller_response && r.status !== "pending" && (
                      <p className="font-body text-xs text-muted-foreground mt-1">
                        Response: {r.seller_response}
                      </p>
                    )}
                    {isSeller && r.status === "accepted" && (
                      <Link to="/nda" className="font-body text-xs text-accent hover:underline mt-2 inline-block">
                        View NDA →
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`font-body text-[10px] tracking-label uppercase px-3 py-1.5 rounded-full border ${
                        r.status === "accepted"
                          ? "border-accent text-accent"
                          : r.status === "rejected"
                          ? "border-destructive/40 text-destructive"
                          : "border-foreground/30 text-foreground/70"
                      }`}
                    >
                      {REQUEST_STATUS_LABEL[r.status] || r.status}
                    </span>
                    {isSeller && r.status === "pending" && (
                      <div className="flex items-center gap-2">
                        <input
                          value={responseNote[r.id] || ""}
                          onChange={(e) =>
                            setResponseNote({ ...responseNote, [r.id]: e.target.value })
                          }
                          placeholder="Optional note…"
                          aria-label="Optional response note"
                          className="w-36 bg-transparent border-b border-border pb-1 font-body text-xs focus:outline-none focus:border-accent"
                        />
                        <button
                          onClick={() => respond(r, "accepted")}
                          disabled={busyId === r.id}
                          aria-label="Accept request"
                          className="p-2 rounded-full border border-accent text-accent hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={() => respond(r, "rejected")}
                          disabled={busyId === r.id}
                          aria-label="Reject request"
                          className="p-2 rounded-full border border-border text-muted-foreground hover:border-destructive hover:text-destructive transition-colors disabled:opacity-50"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    )}
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
