import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import {
  Heart, MapPin, CalendarDays, Users, IndianRupee, TrendingUp, Wallet,
  Info, FileSignature, ArrowLeft, BadgeCheck,
} from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import { useAuth } from "@/context/AuthContext";
import { formatINR, formatDate } from "@/lib/format";
import EmptyState from "@/components/common/EmptyState";
import { listingService } from "@/services/listingService";
import { favoriteService } from "@/services/ndaService";
import { requestService } from "@/services/requestService";

export default function BusinessDetailPage() {
  const { id } = useParams();
  const { user, navigateToLogin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [favorited, setFavorited] = useState(false);
  const [existingRequest, setExistingRequest] = useState(null);

  useEffect(() => {
    listingService.getById(id)
      .then((res) => {
        const b = res.data;
        if (!b) {
          setNotFound(true);
        } else {
          setBusiness(b);
          if (b.is_favorited) setFavorited(true);
        }
      })
      .catch(() => setNotFound(true));
  }, [id, user]);

  useEffect(() => {
    if (!user || !id) return;
    favoriteService.getAll()
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : res.data.results || [];
        const match = items.some((f) => String(f.business || f.business_id) === String(id));
        if (match) setFavorited(true);
      })
      .catch(() => {});

    requestService.getAll()
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : res.data.results || [];
        const match = items.find((r) => String(r.business || r.business_id) === String(id));
        if (match) setExistingRequest(match);
      })
      .catch(() => {});
  }, [id, user]);

  const requireBuyer = () => {
    if (!user) {
      if (navigateToLogin) navigateToLogin(`/business/${id}`);
      else navigate('/login');
      return false;
    }
    return true;
  };

  const toggleFavorite = async () => {
    if (!requireBuyer()) return;
    try {
      const res = await favoriteService.toggle(id);
      const nextFav = res.data?.favorited !== undefined ? res.data.favorited : !favorited;
      setFavorited(nextFav);
      toast({ description: nextFav ? "Saved to your favorites" : "Removed from favorites" });
    } catch (e) {
      toast({ description: "Could not update favorites. Please try again.", variant: "destructive" });
    }
  };

  const goToRequest = () => {
    if (!user) {
      if (navigateToLogin) navigateToLogin(`/business/${id}/request`);
      else navigate('/login');
      return;
    }
    navigate(`/business/${id}/request`);
  };

  if (notFound) {
    return (
      <EmptyState
        title="Business not found."
        subtitle="This listing may have been removed, is not yet approved, or the link is incorrect."
        action="Explore Businesses"
        actionTo="/businesses"
        icon={Info}
      />
    );
  }

  if (!business) {
    return (
      <div className="pt-32 pb-24 px-[4%]">
        <div className="max-w-[1400px] mx-auto">
          <div className="aspect-[16/9] bg-secondary animate-pulse" />
        </div>
      </div>
    );
  }

  const gallery = [business.featured_image, ...(business.images || [])].filter(Boolean);
  const isOwner = user && (user.id === business.owner || user.id === business.created_by_id || user.role === "ADMIN" || user.app_role === "admin");

  const facts = [
    { icon: MapPin, label: "Location", value: [business.location, business.city, business.state].filter(Boolean).join(", ") || "—" },
    { icon: CalendarDays, label: "Established", value: `${business.established_year || "—"} · ${business.years_in_operation || "—"} years in operation` },
    { icon: IndianRupee, label: "Asking price", value: formatINR(business.asking_price) },
    { icon: TrendingUp, label: "Annual revenue", value: formatINR(business.annual_revenue) },
    { icon: Wallet, label: "Annual profit", value: formatINR(business.annual_profit) },
    { icon: Users, label: "Employees", value: business.employees != null ? String(business.employees) : "—" },
  ];

  return (
    <div className="pt-20 md:pt-24 pb-24 md:pb-32">
      <div className="px-[4%] md:px-[2%]">
        <div className="max-w-[1400px] mx-auto">
          <Link to="/businesses" className="inline-flex items-center gap-2 font-body text-xs tracking-label uppercase text-muted-foreground hover:text-foreground transition-colors mb-10">
            <ArrowLeft size={14} /> All businesses
          </Link>

          {/* Gallery */}
          <div className="relative aspect-[16/9] bg-secondary overflow-hidden">
            {gallery[activeImage] ? (
              <img src={gallery[activeImage]} alt={business.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="font-display text-6xl text-muted-foreground/30">{business.name?.charAt(0)}</span>
              </div>
            )}
            {business.status === "approved" && (
              <span className="absolute top-5 left-5 inline-flex items-center gap-1.5 bg-background/90 backdrop-blur px-4 py-2 rounded-full font-body text-[10px] tracking-label uppercase text-accent">
                <BadgeCheck size={13} /> Verified listing
              </span>
            )}
          </div>
          {gallery.length > 1 && (
            <div className="flex gap-3 mt-3 overflow-x-auto pb-1">
              {gallery.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  aria-label={`View image ${i + 1}`}
                  className={`w-24 h-16 shrink-0 overflow-hidden border transition-colors ${i === activeImage ? "border-accent" : "border-transparent opacity-60 hover:opacity-100"}`}
                >
                  <img src={img} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Title + actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mt-14">
            <div className="lg:col-span-2">
              <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-3">
                {business.category_name || business.category} · {business.city}{business.state ? `, ${business.state}` : ""}
              </p>
              <h1 className="font-display text-display-lg font-light">{business.name}</h1>

              {/* Verified Business Badge (Feature 2) */}
              {business.is_verified && (
                <span className="inline-flex items-center gap-1.5 mt-4 font-body text-xs tracking-label uppercase text-accent border border-accent px-3 py-1 rounded-full">
                  <BadgeCheck size={13} /> Verified Business
                </span>
              )}
              {business.short_description && (
                <p className="font-body text-base text-foreground/80 mt-6 leading-relaxed max-w-2xl">
                  {business.short_description}
                </p>
              )}

              {/* Facts */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 mt-12">
                {facts.map((f) => (
                  <div key={f.label} className="border-t border-border py-5 flex items-start gap-4">
                    <f.icon size={16} strokeWidth={1.25} className="text-accent mt-1 shrink-0" />
                    <div>
                      <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground">{f.label}</p>
                      <p className="font-body text-sm text-foreground mt-1">{f.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Highlights */}
              {business.highlights && business.highlights.length > 0 && (
                <div className="mt-12">
                  <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-4">Business highlights</p>
                  <div className="flex flex-wrap gap-2">
                    {business.highlights.map((h, i) => (
                      <span key={i} className="font-body text-xs text-foreground/80 border border-border rounded-full px-4 py-1.5">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Description */}
              {business.description && (
                <div className="mt-12">
                  <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-4">About the business</p>
                  <p className="font-body text-sm text-foreground/80 leading-relaxed whitespace-pre-line max-w-2xl">
                    {business.description}
                  </p>
                </div>
              )}

              {/* Reason for selling */}
              {business.reason_for_selling && (
                <div className="mt-12 border-l-2 border-accent/40 pl-6">
                  <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-2">Reason for selling</p>
                  <p className="font-body text-sm text-foreground/80 leading-relaxed italic">{business.reason_for_selling}</p>
                </div>
              )}

              {/* Seller Handover Support (Feature 1) */}
              {(business.training_provided || business.employee_continuity || business.customer_introductions || business.transition_support_details) && (
                <div className="mt-12 border border-border p-6 rounded-sm">
                  <p className="font-body text-xs tracking-label uppercase text-accent mb-5">Seller Handover &amp; Transition Support</p>
                  <div className="space-y-4">
                    {business.training_provided !== undefined && business.training_provided !== null && (
                      <div className="flex items-start gap-3">
                        <span className="font-body text-[10px] tracking-label uppercase text-muted-foreground w-44 shrink-0 mt-0.5">Training for new owner</span>
                        <span className="font-body text-sm text-foreground">
                          {business.training_provided
                            ? `Yes — ${
                                business.training_duration === "7_days" ? "7 days" :
                                business.training_duration === "15_days" ? "15 days" :
                                business.training_duration === "30_days" ? "30 days" :
                                business.training_duration === "60_days" ? "60 days" :
                                business.training_duration === "custom" ? (business.training_duration_custom || "Custom") :
                                business.training_duration || ""
                              }`
                            : "No"}
                        </span>
                      </div>
                    )}
                    {business.employee_continuity && (
                      <div className="flex items-start gap-3">
                        <span className="font-body text-[10px] tracking-label uppercase text-muted-foreground w-44 shrink-0 mt-0.5">Existing employees</span>
                        <span className="font-body text-sm text-foreground capitalize">
                          {business.employee_continuity === "open_for_discussion" ? "Open for discussion" : business.employee_continuity}
                        </span>
                      </div>
                    )}
                    {business.customer_introductions && (
                      <div className="flex items-start gap-3">
                        <span className="font-body text-[10px] tracking-label uppercase text-muted-foreground w-44 shrink-0 mt-0.5">Customer introductions</span>
                        <span className="font-body text-sm text-foreground capitalize">
                          {business.customer_introductions === "limited" ? "Limited support" : business.customer_introductions}
                        </span>
                      </div>
                    )}
                    {business.transition_support_details && (
                      <div className="pt-3 border-t border-border">
                        <p className="font-body text-xs text-muted-foreground mb-1">Additional details</p>
                        <p className="font-body text-sm text-foreground/80 leading-relaxed">{business.transition_support_details}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Purchase actions */}
              {!isOwner && (
                <div className="mt-14 border-t border-border pt-10 flex flex-col sm:flex-row sm:items-center gap-4">
                  <button
                    onClick={goToRequest}
                    className="w-full sm:w-auto text-xs px-10 py-4 font-body tracking-widest uppercase rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 transition-all duration-500"
                  >
                    <FileSignature size={14} className="inline mr-2" /> Request to Buy
                  </button>
                  <button onClick={toggleFavorite} className="ghost-btn text-xs w-full sm:w-auto">
                    <Heart size={13} className={"mr-2 " + (favorited ? "fill-accent text-accent" : "")} />
                    {favorited ? "Saved to Favorites" : "Save Business"}
                  </button>
                </div>
              )}
            </div>

            {/* Action rail */}
            <div>
              <div className="border border-border rounded-sm p-8 lg:sticky lg:top-28">
                <p className="font-body text-[10px] tracking-label uppercase text-muted-foreground">Asking price</p>
                <p className="font-display text-4xl font-light text-foreground mt-2">{formatINR(business.asking_price)}</p>
                <div className="hairline my-8" />

                {isOwner ? (
                  <p className="font-body text-xs text-muted-foreground leading-relaxed">
                    This is your listing. Manage it from My Listings — buyer interest will appear in your requests.
                  </p>
                ) : existingRequest ? (
                  <div>
                    <p className="font-body text-sm text-foreground">
                      You already have a {existingRequest.request_type === "contact" ? "contact request for" : existingRequest.request_type === "buy" ? "purchase request for" : "interest request for"} this business.
                    </p>
                    <p className="font-body text-xs tracking-label uppercase text-accent mt-2">
                      Status: {existingRequest.status}
                    </p>
                    <Link to="/requests" className="ghost-btn text-xs w-full text-center block mt-6">
                      View My Requests
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={goToRequest}
                      className="text-xs px-8 py-3 font-body tracking-widest uppercase rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 transition-all duration-500"
                    >
                      <FileSignature size={13} className="inline mr-2" /> Request to Buy
                    </button>
                    <p className="font-body text-[10px] text-muted-foreground mt-2 leading-relaxed">
                      Opens a purchase request form with a signed NDA acknowledgement. Seller contact details stay private until your request is accepted.
                    </p>
                  </div>
                )}

                {!isOwner && (
                  <button
                    onClick={toggleFavorite}
                    className="w-full mt-6 flex items-center justify-center gap-2 font-body text-xs tracking-label uppercase text-foreground hover:text-accent transition-colors py-3 border-t border-border"
                  >
                    <Heart size={14} className={favorited ? "fill-accent text-accent" : ""} />
                    {favorited ? "Saved to favorites" : "Save Business"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
