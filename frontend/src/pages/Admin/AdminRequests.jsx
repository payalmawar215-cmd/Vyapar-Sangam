import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Handshake, FileText, KeyRound } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import { formatDate, NDA_STATUS_LABEL, DEAL_STATUS_LABEL } from "@/lib/format";
import { requestService } from "@/services/requestService";
import { ndaService, dealService } from "@/services/ndaService";

const TABS = [
  { key: "interests", label: "Interest Requests", icon: Handshake },
  { key: "ndas", label: "NDA Records", icon: FileText },
  { key: "deals", label: "Deals", icon: KeyRound },
];

export default function AdminRequests() {
  const [tab, setTab] = useState("interests");
  const [interests, setInterests] = useState(null);
  const [ndas, setNdas] = useState(null);
  const [deals, setDeals] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [iRes, nRes, dRes] = await Promise.all([
          requestService.getAll().catch(() => ({ data: [] })),
          ndaService.getAll().catch(() => ({ data: [] })),
          dealService.getAll().catch(() => ({ data: [] })),
        ]);
        setInterests(Array.isArray(iRes.data) ? iRes.data : iRes.data.results || []);
        setNdas(Array.isArray(nRes.data) ? nRes.data : nRes.data.results || []);
        setDeals(Array.isArray(dRes.data) ? dRes.data : dRes.data.results || []);
      } catch (e) {
        setInterests([]);
        setNdas([]);
        setDeals([]);
      }
    };
    load();
  }, []);

  const data = tab === "interests" ? interests : tab === "ndas" ? ndas : deals;
  const emptyCopy = {
    interests: "No interest requests on the platform yet.",
    ndas: "No NDA records yet.",
    deals: "No deals yet.",
  };

  const currentTabObj = TABS.find((t) => t.key === tab) || TABS[0];

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Requests"
        titleAccent="deals"
        subtitle="A read-only record of every interest request, NDA acknowledgement and deal across the marketplace."
      />
      <section className="px-[4%] md:px-[2%] pb-24">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-wrap gap-2 mb-12">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`font-body text-xs tracking-label uppercase px-5 py-2 rounded-full border transition-colors inline-flex items-center gap-2 ${
                  tab === t.key ? "border-foreground bg-foreground text-background" : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <t.icon size={12} /> {t.label}
              </button>
            ))}
          </div>

          {data === null ? (
            <div className="space-y-4">{[...Array(3)].map((_, i) => <div key={i} className="h-14 bg-secondary animate-pulse rounded" />)}</div>
          ) : data.length === 0 ? (
            <EmptyState title={emptyCopy[tab]} subtitle="Records will appear here as buyers and sellers progress through the workflow." icon={currentTabObj.icon} />
          ) : (
            <div className="divide-y divide-border border-t border-b border-border">
              {tab === "interests" && interests.map((r) => (
                <div key={r.id} className="py-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-body text-sm text-foreground">
                      <Link to={`/business/${r.business || r.business_id}`} className="hover:text-accent">
                        {r.business_name || r.listing_name || "Business"}
                      </Link>
                    </p>
                    <p className="font-body text-xs text-muted-foreground mt-0.5">
                      Buyer: {r.buyer_name || r.created_by || "Buyer"} ({r.buyer_email || ""}) · {r.request_type === "contact" ? "Contact request" : "Interest"} · {formatDate(r.created_at || r.created_date)}
                    </p>
                  </div>
                  <span className="font-body text-[10px] tracking-label uppercase px-3 py-1.5 rounded-full border border-border text-muted-foreground">{r.status}</span>
                </div>
              ))}
              {tab === "ndas" && ndas.map((n) => (
                <div key={n.id} className="py-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-body text-sm text-foreground">
                      <Link to={`/nda/${n.id}`} className="hover:text-accent">
                        {n.business_name || "Business"}
                      </Link>
                    </p>
                    <p className="font-body text-xs text-muted-foreground mt-0.5">
                      {n.buyer_name || "Buyer"} ↔ {n.seller_name || "Seller"} · opened {formatDate(n.created_at || n.created_date)}
                    </p>
                  </div>
                  <span className="font-body text-[10px] tracking-label uppercase px-3 py-1.5 rounded-full border border-border text-muted-foreground">
                    {NDA_STATUS_LABEL[n.status] || n.status}
                  </span>
                </div>
              ))}
              {tab === "deals" && deals.map((d) => (
                <div key={d.id} className="py-5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-body text-sm text-foreground">
                      <Link to={`/business/${d.business || d.business_id}`} className="hover:text-accent">
                        {d.business_name || "Business"}
                      </Link>
                    </p>
                    <p className="font-body text-xs text-muted-foreground mt-0.5">
                      {d.buyer_name || "Buyer"} ↔ {d.seller_name || "Seller"} · opened {formatDate(d.created_at || d.created_date)}
                    </p>
                  </div>
                  <span className="font-body text-[10px] tracking-label uppercase px-3 py-1.5 rounded-full border border-accent text-accent">
                    {DEAL_STATUS_LABEL[d.status] || d.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
