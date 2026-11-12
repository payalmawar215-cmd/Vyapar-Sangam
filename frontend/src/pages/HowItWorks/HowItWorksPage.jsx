import { Link } from "react-router-dom";
import { Store, ShieldCheck, Search, Handshake, FileText, KeyRound, ArrowRight } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";

const steps = [
  { icon: Store, title: "Seller lists the business", desc: "The owner creates a listing with the business story, category, location, years in operation, financials and photographs. It can be saved as a draft and refined before submission." },
  { icon: ShieldCheck, title: "Admin verifies", desc: "Our team reviews every submitted listing. Only listings that pass review become publicly visible on the marketplace — with a verified badge." },
  { icon: Search, title: "Buyer discovers", desc: "Buyers browse, search and filter verified businesses by category, price, location and age of the business, then compare shortlisted options." },
  { icon: Handshake, title: "Buyer shows interest", desc: "A serious buyer sends a structured interest request. The seller reviews it and accepts or declines — politely, in one place." },
  { icon: FileText, title: "NDA", desc: "Once interest is accepted, both parties acknowledge the non-disclosure terms digitally. Only then are sensitive details exchanged." },
  { icon: KeyRound, title: "Deal", desc: "With the NDA completed, a deal is opened. Discussions move forward and the succession journey officially begins." },
];

export default function HowItWorksPage() {
  return (
    <div>
      <PageHeader
        eyebrow="How It Works"
        title="From legacy to"
        titleAccent="new hands"
        subtitle="Six clear steps connect a business owner ready to move on with an entrepreneur ready to take over. Every stage is structured, visible and secure."
      />

      <section className="px-[4%] md:px-[2%] pb-24 md:pb-32">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-16 gap-y-14">
            {steps.map((step, i) => (
              <div key={step.title} className="border-t border-border pt-8">
                <div className="flex items-baseline justify-between mb-6">
                  <span className="font-display text-3xl font-light text-accent/70">{String(i + 1).padStart(2, "0")}</span>
                  <step.icon size={20} strokeWidth={1.25} className="text-muted-foreground" />
                </div>
                <h3 className="font-display text-2xl font-light">{step.title}</h3>
                <p className="font-body text-sm text-muted-foreground mt-3 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-foreground">
        <div className="px-[6%] py-24 md:py-36 max-w-[1100px] mx-auto text-center">
          <h2 className="font-display text-display-lg font-light text-white leading-[1.15]">
            A flow built for <span className="italic text-[#facca3]">both sides</span> of the table
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-16 text-left">
            <div className="border-t border-white/15 pt-8">
              <p className="font-body text-xs tracking-label uppercase text-[#facca3] mb-6">If you are selling</p>
              <p className="font-body text-sm text-white/60 leading-relaxed">
                List your business, keep control of what buyers see, receive serious interest,
                and share sensitive details only after the NDA is acknowledged. You decide who moves forward.
              </p>
            </div>
            <div className="border-t border-white/15 pt-8">
              <p className="font-body text-xs tracking-label uppercase text-[#facca3] mb-6">If you are buying</p>
              <p className="font-body text-sm text-white/60 leading-relaxed">
                Discover verified businesses with real numbers, compare them side by side,
                express interest in one click, and enter a clear NDA step before deeper conversations.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-4 mt-16">
            <Link
              to="/businesses"
              className="text-xs px-8 py-3 font-body tracking-widest uppercase rounded-full border border-white bg-white text-black hover:bg-white/80 transition-all duration-500"
            >
              Explore Businesses <ArrowRight size={13} className="inline ml-2" />
            </Link>
            <Link to="/add-business" className="ghost-btn-light text-xs">List Your Business</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
