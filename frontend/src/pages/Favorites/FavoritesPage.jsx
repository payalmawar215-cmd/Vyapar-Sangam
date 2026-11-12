import { useEffect, useState } from "react";
import { Heart, HeartOff } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import { useAuth } from "@/context/AuthContext";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import BusinessCard from "@/components/common/BusinessCard";
import { favoriteService } from "@/services/ndaService";

export default function FavoritesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [pairs, setPairs] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const res = await favoriteService.getAll();
        const items = Array.isArray(res.data) ? res.data : res.data.results || [];
        setPairs(
          items
            .map((f) => ({
              favId: f.id,
              business: f.business_details || f.business,
            }))
            .filter((p) => p.business)
        );
      } catch (e) {
        setError(true);
      }
    };
    load();
  }, [user]);

  const unfavorite = async (favId) => {
    try {
      await favoriteService.delete(favId);
      setPairs(pairs.filter((p) => p.favId !== favId));
      toast({ description: "Removed from favorites" });
    } catch {
      toast({ description: "Could not remove favorite.", variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Buyer"
        title="Saved"
        titleAccent="businesses"
        subtitle="Your shortlist. Compare, revisit, and express interest when one feels right."
      />
      <section className="px-[4%] md:px-[2%] pb-24 md:pb-32">
        <div className="max-w-[1400px] mx-auto">
          {error ? (
            <EmptyState title="Something went wrong." subtitle="We couldn't load your favorites. Please refresh and try again." icon={HeartOff} />
          ) : pairs === null ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="aspect-[5/4] bg-secondary animate-pulse rounded-sm" />
              ))}
            </div>
          ) : pairs.length === 0 ? (
            <EmptyState
              title="You haven't saved any businesses yet."
              subtitle="Tap the heart on any listing to keep it here for easy comparison."
              action="Explore Businesses"
              actionTo="/businesses"
              icon={Heart}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {pairs.map((p) => (
                <div key={p.favId} className="relative">
                  <BusinessCard business={p.business} favorited onUnfavorite={() => unfavorite(p.favId)} />
                  <button
                    onClick={() => unfavorite(p.favId)}
                    className="absolute bottom-0 right-0 font-body text-[10px] tracking-label uppercase text-muted-foreground hover:text-destructive transition-colors px-[2%] cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
