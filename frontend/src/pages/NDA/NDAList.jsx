import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FileText, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import { ndaService } from "@/services/ndaService";
import { formatDate, NDA_STATUS_LABEL } from "@/lib/format";

export default function NDAList() {
  const { user } = useAuth();
  const [ndas, setNdas] = useState(null);

  const role = user?.app_role || user?.role?.toLowerCase();
  const isAdmin = role === "admin" || user?.role === "ADMIN" || user?.is_staff;

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await ndaService.getAll();
        setNdas(res.data || []);
      } catch (e) {
        setNdas([]);
      }
    };
    load();
  }, [user]);

  return (
    <div>
      <PageHeader
        eyebrow="Confidentiality"
        title="Non-disclosure"
        titleAccent="agreements"
        subtitle="An NDA is opened after a seller accepts buyer interest. Both sides acknowledge the terms before sensitive details change hands."
      />
      <section className="px-[4%] md:px-[2%] pb-24">
        <div className="max-w-[1400px] mx-auto">
          {ndas === null ? (
            <div className="space-y-4">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-16 bg-secondary animate-pulse rounded" />
              ))}
            </div>
          ) : ndas.length === 0 ? (
            <EmptyState
              title="No NDAs yet."
              subtitle="Once a seller accepts your interest request, an NDA will be prepared here for acknowledgement."
              action="Explore Businesses"
              actionTo="/businesses"
              icon={FileText}
            />
          ) : (
            <div className="divide-y divide-border border-t border-b border-border">
              {ndas.map((n) => (
                <div key={n.id} className="py-6 flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-body text-sm text-foreground">
                      {n.business_title || n.business?.name || "Business"}
                    </p>
                    <p className="font-body text-xs text-muted-foreground mt-0.5">
                      {user.id === n.buyer || user.id === n.buyer_id
                        ? `Seller: ${n.seller_name || n.seller_username}`
                        : `Buyer: ${n.buyer_name || n.buyer_username}`}{" "}
                      · opened {formatDate(n.created_at || n.created_date)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-body text-[10px] tracking-label uppercase px-3 py-1.5 rounded-full border ${
                        n.status === "completed"
                          ? "border-accent text-accent"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      {NDA_STATUS_LABEL[n.status] || n.status}
                    </span>
                    <Link
                      to={`/nda/${n.id}`}
                      className="font-body text-xs tracking-label uppercase text-foreground hover:text-accent transition-colors inline-flex items-center gap-1.5"
                    >
                      Open <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
          {isAdmin && ndas?.length === 0 && (
            <p className="font-body text-xs text-muted-foreground mt-8">
              As admin, you'll see NDA records once buyer–seller pairs begin the confidentiality step.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
