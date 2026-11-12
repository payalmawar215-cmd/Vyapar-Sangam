import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-foreground text-background w-full">
      <div className="px-[2%] w-full">
        <div className="py-24 md:py-40 pb-16 md:pb-40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 md:gap-24 px-[2%] mx-auto max-w-[1400px]">
            <div>
              <h2 className="font-display text-display-lg font-light mb-6">
                Ready to continue a<br />
                <span className="italic text-[#facca3]">business legacy?</span>
              </h2>
              <p className="font-body text-background/60 text-sm leading-relaxed max-w-md mb-8">
                Connecting trusted business owners with the next generation of entrepreneurs.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/businesses" className="ghost-btn-light text-xs">
                  Explore Businesses <ArrowRight size={13} className="inline ml-2" />
                </Link>
                <Link to="/how-it-works" className="font-body text-xs tracking-label uppercase text-background/60 hover:text-background transition-colors self-center">
                  How It Works
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 md:gap-x-12 gap-y-12">
              <div>
                <h3 className="font-body text-xs tracking-label uppercase text-background/60 mb-4">Navigate</h3>
                <nav className="flex flex-col gap-2">
                  <Link to="/" className="font-body text-sm text-background/70 hover:text-background transition-colors">Home</Link>
                  <Link to="/businesses" className="font-body text-sm text-background/70 hover:text-background transition-colors">Explore Businesses</Link>
                  <Link to="/how-it-works" className="font-body text-sm text-background/70 hover:text-background transition-colors">How It Works</Link>
                  <Link to="/about" className="font-body text-sm text-background/70 hover:text-background transition-colors">About</Link>
                </nav>
              </div>
              <div>
                <h3 className="font-body text-xs tracking-label uppercase text-background/60 mb-4">For</h3>
                <nav className="flex flex-col gap-2">
                  <Link to="/select-role" className="font-body text-sm text-background/70 hover:text-background transition-colors">Buyers</Link>
                  <Link to="/select-role" className="font-body text-sm text-background/70 hover:text-background transition-colors">Sellers</Link>
                  <Link to="/how-it-works" className="font-body text-sm text-background/70 hover:text-background transition-colors">NDA &amp; Deals</Link>
                </nav>
              </div>
              <div>
                <h3 className="font-body text-xs tracking-label uppercase text-background/60 mb-4">Get Started</h3>
                <nav className="flex flex-col gap-2">
                  <Link to="/select-role" className="font-body text-sm text-background/70 hover:text-background transition-colors">Register</Link>
                  <Link to="/businesses" className="font-body text-sm text-background/70 hover:text-background transition-colors">Browse Listings</Link>
                  <Link to="/about" className="font-body text-sm text-background/70 hover:text-background transition-colors">Our Mission</Link>
                </nav>
              </div>
              <div>
                <h3 className="font-body text-xs tracking-label uppercase text-background/60 mb-4">Trust</h3>
                <p className="font-body text-sm text-background/70 leading-relaxed">
                  Verified listings. Digital NDA workflow. A structured path from first interest to succession.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-background/10 py-6 pb-10 md:pb-8 bg-foreground w-full">
        <div className="px-[2%]">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 max-w-[1400px] mx-auto">
            <Link to="/" className="font-display text-xl font-light tracking-editorial order-first text-white">
              VYAPAR <span style={{ color: "#FFCBA4" }}>SANGAM</span>
            </Link>
            <span className="font-body text-xs text-background/40">
              © 2026 Vyapar Sangam — Your Business Legacy. Their New Beginning.
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
