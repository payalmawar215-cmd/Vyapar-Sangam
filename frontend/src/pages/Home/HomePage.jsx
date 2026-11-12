import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Store, ShieldCheck, Search, Handshake, FileText, KeyRound,
  Building2, Compass, MessagesSquare, FileCheck, RefreshCcw, Eye,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import NetworkCanvas from "@/components/common/NetworkCanvas";
import VideoHero from "@/components/common/VideoHero";
import BusinessCard from "@/components/common/BusinessCard";
import EmptyState from "@/components/common/EmptyState";
import { listingService } from "@/services/listingService";
import { authService } from "@/services/authService";

const steps = [
  { icon: Store, title: "Seller lists the business", desc: "An owner prepares a detailed listing — story, numbers, photographs — and submits it for review." },
  { icon: ShieldCheck, title: "Admin verifies", desc: "Every listing is reviewed by our team before it becomes publicly visible." },
  { icon: Search, title: "Buyer discovers", desc: "Buyers search, filter and compare verified opportunities across categories and cities." },
  { icon: Handshake, title: "Buyer shows interest", desc: "A structured interest request goes to the seller — no cold calls, no spam." },
  { icon: FileText, title: "NDA", desc: "Sensitive details are shared under a digital non-disclosure acknowledgement." },
  { icon: KeyRound, title: "Deal", desc: "Both sides move to discussion and the succession journey begins." },
];

const buyerPoints = [
  "Discover established, verified businesses",
  "Compare opportunities with real numbers",
  "View structured business information",
  "Express interest with one click",
  "Proceed through a clear NDA step",
  "Manage potential deals in one place",
];

const sellerPoints = [
  "List your business with dignity and detail",
  "Control what buyers see — and when",
  "Receive serious, structured buyer interest",
  "Review and respond to every request",
  "Share sensitive details only under NDA",
  "Proceed securely toward succession",
];

const values = [
  { icon: Compass, title: "Structured discovery", desc: "Search and compare by category, city, price and age — never by guesswork." },
  { icon: ShieldCheck, title: "Verified listings", desc: "Nothing goes public until our team has reviewed it." },
  { icon: MessagesSquare, title: "Organized communication", desc: "Interest, responses and contact requests all live in one structured flow." },
  { icon: FileCheck, title: "Digital NDA workflow", desc: "Confidentiality handled before sensitive details change hands." },
  { icon: RefreshCcw, title: "True succession", desc: "Built for handovers — not just transactions." },
  { icon: Eye, title: "Transparent process", desc: "Every status visible to both sides, at every stage." },
];

export default function HomePage() {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    listingService.getAll({ status: "approved", limit: 6 })
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : res.data.results || [];
        setBusinesses(items);
      })
      .catch(() => setBusinesses([]));

    authService.getPlatformSettings()
      .then((data) => setSettings(data))
      .catch(() => setSettings(null));
  }, []);

  const isAdmin = user?.app_role === "admin" || user?.role === "ADMIN" || user?.is_staff;

  return (
    <div>
      {/* Hero */}
      <section className="relative min-h-screen bg-foreground flex items-center overflow-hidden">
        <NetworkCanvas />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(to bottom, rgba(10,10,10,0.2), rgba(10,10,10,0.75))" }}
        />
        <div className="relative px-[4%] md:px-[2%] w-full pt-24">
          <div className="max-w-[1400px] mx-auto">
            <p className="font-body text-xs tracking-label uppercase text-[#facca3] mb-6">
              A business succession marketplace
            </p>
            <h1 className="font-display text-display-xl md:text-[clamp(3.5rem,8vw,7rem)] font-light text-white leading-[1.05]">
              Your Business Legacy.<br />
              <span className="italic text-[#facca3]">Their New Beginning.</span>
            </h1>
            <p className="font-body text-sm md:text-base text-white/60 max-w-xl mt-8 leading-relaxed">
              Vyapar Sangam connects trusted business owners with the next generation of entrepreneurs —
              through verified listings, structured interest, and a clear path from handshake to handover.
            </p>
            <div className="flex flex-wrap gap-4 mt-12">
              <Link
                to="/businesses"
                className="text-xs px-8 py-3 font-body tracking-widest uppercase rounded-full border border-white bg-white text-black hover:bg-white/80 transition-all duration-500"
              >
                Explore Businesses
              </Link>
              <Link to="/add-business" className="ghost-btn-light text-xs">
                List Your Business
              </Link>
            </div>
          </div>
        </div>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 font-body text-[10px] tracking-label uppercase text-white/40">
          Scroll
        </div>
      </section>

      {/* Intro film */}
      <section className="px-[4%] md:px-[2%] py-24 md:py-40">
        <div className="max-w-[1400px] mx-auto">
          <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-4">Our Story</p>
          <h2 className="font-display text-display-lg font-light mb-12">
            Begin with the <span className="italic text-accent">film</span>
          </h2>
          <div className="max-w-5xl mx-auto">
            <VideoHero
              videoUrl={settings?.intro_video_url}
              posterUrl={settings?.intro_video_poster}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-[4%] md:px-[2%] py-24 md:py-32 border-t border-border">
        <div className="max-w-[1400px] mx-auto">
          <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-4">The Journey</p>
          <h2 className="font-display text-display-lg font-light mb-16 md:mb-24">
            How it <span className="italic text-accent">works</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-14">
            {steps.map((step, i) => (
              <div key={step.title} className="border-t border-border pt-8">
                <div className="flex items-baseline justify-between mb-6">
                  <span className="font-display text-3xl font-light text-accent/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <step.icon size={20} strokeWidth={1.25} className="text-muted-foreground" />
                </div>
                <h3 className="font-display text-2xl font-light">{step.title}</h3>
                <p className="font-body text-sm text-muted-foreground mt-3 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For buyers / sellers */}
      <section className="py-24 md:py-32 border-t border-border">
        <div className="grid grid-cols-1 md:grid-cols-2">
          <div className="px-[6%] py-16 md:py-24 bg-secondary/50 border-b md:border-b-0 md:border-r border-border">
            <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-4">For Buyers</p>
            <h2 className="font-display text-display-md font-light mb-10">Acquire what is <span className="italic text-accent">already thriving</span></h2>
            <ul className="space-y-4">
              {buyerPoints.map((p) => (
                <li key={p} className="font-body text-sm text-foreground/80 flex gap-3">
                  <span className="w-1 h-1 rounded-full bg-accent mt-2 shrink-0" /> {p}
                </li>
              ))}
            </ul>
          </div>
          <div className="px-[6%] py-16 md:py-24">
            <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-4">For Sellers</p>
            <h2 className="font-display text-display-md font-light mb-10">Pass the baton with <span className="italic text-accent">confidence</span></h2>
            <ul className="space-y-4">
              {sellerPoints.map((p) => (
                <li key={p} className="font-body text-sm text-foreground/80 flex gap-3">
                  <span className="w-1 h-1 rounded-full bg-accent mt-2 shrink-0" /> {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Why Vyapar Sangam */}
      <section className="px-[4%] md:px-[2%] py-24 md:py-32 border-t border-border">
        <div className="max-w-[1400px] mx-auto">
          <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-4">Why Vyapar Sangam</p>
          <h2 className="font-display text-display-lg font-light mb-16 md:mb-24">
            Built for <span className="italic text-accent">trust</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-14">
            {values.map((v) => (
              <div key={v.title} className="border-t border-border pt-8">
                <v.icon size={20} strokeWidth={1.25} className="text-accent mb-5" />
                <h3 className="font-display text-xl font-light">{v.title}</h3>
                <p className="font-body text-sm text-muted-foreground mt-2 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest listings */}
      <section className="px-[4%] md:px-[2%] py-24 md:py-32 border-t border-border">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex items-end justify-between mb-16">
            <div>
              <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-4">The Marketplace</p>
              <h2 className="font-display text-display-lg font-light">
                Businesses <span className="italic text-accent">seeking successors</span>
              </h2>
            </div>
            <Link to="/businesses" className="hidden md:inline-flex items-center gap-2 font-body text-xs tracking-label uppercase text-foreground hover:text-accent transition-colors">
              View all <Building2 size={14} />
            </Link>
          </div>
          {businesses === null ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="aspect-[5/4] bg-secondary animate-pulse rounded-sm" />
              ))}
            </div>
          ) : businesses.length === 0 ? (
            <EmptyState
              title="No businesses listed yet."
              subtitle="New business opportunities will appear here once verified sellers list their businesses."
              action="List Your Business"
              actionTo="/add-business"
              icon={Store}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {businesses.map((b) => (
                <BusinessCard key={b.id} business={b} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="px-[4%] md:px-[2%] py-28 md:py-44 bg-foreground text-center">
        <p className="font-body text-xs tracking-label uppercase text-[#facca3] mb-6">Begin today</p>
        <h2 className="font-display text-display-lg md:text-display-xl font-light text-white">
          Ready to continue a<br /><span className="italic text-[#facca3]">business legacy?</span>
        </h2>
        <div className="flex flex-wrap justify-center gap-4 mt-12">
          <Link
            to="/businesses"
            className="text-xs px-8 py-3 font-body tracking-widest uppercase rounded-full border border-white bg-white text-black hover:bg-white/80 transition-all duration-500"
          >
            Explore Businesses
          </Link>
          <Link to="/add-business" className="ghost-btn-light text-xs">
            List Your Business
          </Link>
        </div>
      </section>
    </div>
  );
}
