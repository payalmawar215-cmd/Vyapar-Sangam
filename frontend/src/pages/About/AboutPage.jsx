import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Target, HeartHandshake, Compass, ShieldCheck, RefreshCcw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import NetworkCanvas from "@/components/common/NetworkCanvas";
import { authService } from "@/services/authService";

export default function AboutPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    authService.getPlatformSettings()
      .then((data) => setSettings(data))
      .catch(() => {});
  }, []);

  return (
    <div>
      <section className="px-[4%] md:px-[2%] pt-32 md:pt-44 pb-16 md:pb-24">
        <div className="max-w-[1400px] mx-auto">
          <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-4">About Vyapar Sangam</p>
          <h1 className="font-display text-display-xl font-light leading-[1.08]">
            Your Business Legacy.<br />
            <span className="italic text-accent">Their New Beginning.</span>
          </h1>
          <p className="font-body text-sm md:text-base text-muted-foreground max-w-2xl mt-8 leading-relaxed">
            Connecting trusted business owners with the next generation of entrepreneurs.
          </p>
          <div className="hairline mt-16" />
        </div>
      </section>

      <section className="relative bg-foreground overflow-hidden">
        <div className="absolute inset-0 opacity-40 pointer-events-none">
          <NetworkCanvas />
        </div>
        <div className="relative px-[6%] py-24 md:py-40 max-w-[1100px] mx-auto text-center">
          <h2 className="font-display text-display-lg md:text-display-xl font-light text-white leading-[1.15]">
            Every business is someone's life work.<br />
            <span className="italic text-[#facca3]">We make sure it finds the right hands.</span>
          </h2>
          <p className="font-body text-sm md:text-base text-white/60 max-w-2xl mx-auto mt-10 leading-relaxed">
            Vyapar Sangam is a business succession marketplace. We help owners of established
            businesses — shops, factories, services, studios — find serious buyers and young
            entrepreneurs who want to build on an existing foundation rather than start from zero.
          </p>
        </div>
      </section>

      <section className="px-[4%] md:px-[2%] py-24 md:py-32">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-x-16 gap-y-14">
          {[
            { icon: Target, title: "Our Mission", desc: "To give every small and medium business a structured, dignified path to succession — and give the next generation a way to own what already works." },
            { icon: HeartHandshake, title: "Our Approach", desc: "Trust before transaction. Listings are verified before they go public, sensitive details are shared only under NDA, and every step is visible to both sides." },
            { icon: Compass, title: "Our Promise", desc: "A calm, transparent process: discover, express interest, acknowledge the NDA, and move to discussion — with no noise in between." },
          ].map((c) => (
            <div key={c.title} className="border-t border-border pt-8">
              <c.icon size={20} strokeWidth={1.25} className="text-accent mb-5" />
              <h3 className="font-display text-2xl font-light">{c.title}</h3>
              <p className="font-body text-sm text-muted-foreground mt-3 leading-relaxed">{c.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-[4%] md:px-[2%] py-24 md:py-32 border-t border-border">
        <div className="max-w-[1400px] mx-auto">
          <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-4">What we stand for</p>
          <h2 className="font-display text-display-lg font-light mb-16">
            Succession, <span className="italic text-accent">done properly</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
            {[
              { icon: ShieldCheck, text: "Verified listings — nothing is public until reviewed" },
              { icon: Compass, text: "Structured discovery across categories and cities" },
              { icon: RefreshCcw, text: "A workflow designed for genuine handovers" },
              { icon: HeartHandshake, text: "Respect for both the legacy and the newcomer" },
            ].map((v, i) => (
              <div key={i} className="flex items-start gap-4">
                <v.icon size={18} strokeWidth={1.25} className="text-accent mt-1 shrink-0" />
                <p className="font-body text-sm text-foreground/80 leading-relaxed">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-[4%] md:px-[2%] py-28 md:py-40 text-center">
        <h2 className="font-display text-display-lg font-light">
          Join the <span className="italic text-accent">sangam</span>
        </h2>
        <p className="font-body text-sm text-muted-foreground mt-4 max-w-md mx-auto">
          Where owners and entrepreneurs meet.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-10">
          <Link to="/businesses" className="text-xs px-8 py-3 font-body tracking-widest uppercase rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 transition-all duration-500">
            Explore Businesses
          </Link>
          <Link to="/add-business" className="ghost-btn text-xs">List Your Business</Link>
        </div>
      </section>
    </div>
  );
}
