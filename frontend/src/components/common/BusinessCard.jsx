import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { formatINR } from "@/lib/format";
import { useAuth } from "@/context/AuthContext";
import { favoriteService } from "@/services/ndaService";
import { useToast } from "@/lib/ToastContext";

export default function BusinessCard({ business, favorited = false, onUnfavorite }) {
  const { user, navigateToLogin } = useAuth();
  const { toast } = useToast();
  const [fav, setFav] = useState(favorited);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setFav(favorited || business?.is_favorited || false);
  }, [favorited, business]);

  const toggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      if (navigateToLogin) navigateToLogin(window.location.pathname);
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const res = await favoriteService.toggle(business.id);
      const isNowFav = res.data?.favorited !== undefined ? res.data.favorited : !fav;
      setFav(isNowFav);
      toast({ description: isNowFav ? "Saved to your favorites" : "Removed from favorites" });
      if (!isNowFav && onUnfavorite) {
        onUnfavorite(business.id);
      }
    } catch {
      toast({ description: "Could not update favorites.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const image = business.featured_image || (Array.isArray(business.images) ? business.images[0] : null);

  return (
    <Link to={`/business/${business.id}`} className="group block">
      <div className="transition-transform duration-300">
        <div className="relative overflow-hidden aspect-[5/4] bg-secondary">
          {image ? (
            <img
              src={image}
              alt={business.name || business.title}
              loading="lazy"
              className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-secondary">
              <span className="font-display text-3xl text-muted-foreground/40">
                {(business.name || business.title || '?').charAt(0)?.toUpperCase()}
              </span>
            </div>
          )}

          <button
            onClick={toggleFavorite}
            aria-label={fav ? "Remove from favorites" : "Save business"}
            className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-background/90 backdrop-blur flex items-center justify-center transition-colors hover:bg-background"
          >
            <Heart
              size={16}
              className={fav ? "text-accent fill-accent" : "text-foreground/60"}
            />
          </button>

          <div
            className="absolute bottom-0 left-0 right-0 h-1/2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-700 ease-out"
            style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 100%)" }}
          />
          <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-0 opacity-100 md:translate-y-2 md:opacity-0 md:group-hover:translate-y-0 md:group-hover:opacity-100 transition-all duration-700 ease-out">
            <div className="flex items-end justify-between text-white">
              <span className="font-display text-2xl font-light">{formatINR(business.asking_price)}</span>
              <span className="font-body text-xs tracking-label uppercase">
                {business.years_in_operation ? `${business.years_in_operation} yrs` : (business.city || business.location)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-4 md:mt-6 px-[2%]">
          <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-1">
            {business.category_name || business.category} · {business.city || business.location}
            {business.status === "approved" && (
              <span className="text-accent ml-2">Verified</span>
            )}
          </p>
          <h3 className="font-display font-light text-display-sm text-foreground">{business.name || business.title}</h3>
          <p className="font-body text-sm text-muted-foreground mt-2 line-clamp-2">
            {business.short_description || business.description}
          </p>
        </div>
      </div>
    </Link>
  );
}
