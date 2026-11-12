import { useEffect, useState } from "react";
import { Search as SearchIcon, Store } from "lucide-react";
import BusinessCard from "@/components/common/BusinessCard";
import EmptyState from "@/components/common/EmptyState";
import PageHeader from "@/components/common/PageHeader";
import { listingService, categoryService } from "@/services/listingService";

const priceRanges = [
  { label: "Any price", value: "" },
  { label: "Under ₹10 L", value: "0-1000000" },
  { label: "₹10 L – ₹50 L", value: "1000000-5000000" },
  { label: "₹50 L – ₹1 Cr", value: "5000000-10000000" },
  { label: "Above ₹1 Cr", value: "10000000-99999999999" },
];

const ageRanges = [
  { label: "Any age", value: "" },
  { label: "Under 5 years", value: "0-4" },
  { label: "5 – 10 years", value: "5-10" },
  { label: "10 – 25 years", value: "10-25" },
  { label: "25+ years", value: "25-999" },
];

const sorts = [
  { label: "Newest first", value: "-created_at" },
  { label: "Oldest first", value: "created_at" },
  { label: "Price: low to high", value: "asking_price" },
  { label: "Price: high to low", value: "-asking_price" },
];

export default function ListingsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [age, setAge] = useState("");
  const [sort, setSort] = useState("-created_at");
  const [categories, setCategories] = useState([]);
  const [businesses, setBusinesses] = useState(null);
  const [error, setError] = useState(false);
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    categoryService.getAll()
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : res.data.results || [];
        setCategories(items);
      })
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const params = { status: "approved" };
    const term = search.trim();
    if (term) params.search = term;
    if (category) params.category = category;
    if (price) {
      const [min, max] = price.split("-");
      if (min) params.min_price = min;
      if (max) params.max_price = max;
    }
    if (age) {
      const [min, max] = age.split("-");
      if (min) params.min_age = min;
      if (max) params.max_age = max;
    }
    if (sort) params.sort = sort;

    setBusinesses(null);
    setError(false);

    listingService.getAll(params)
      .then((res) => {
        const items = Array.isArray(res.data) ? res.data : res.data.results || [];
        setBusinesses(items);
      })
      .catch(() => setError(true));
  }, [search, category, price, age, sort]);

  const hasFilters = search || category || price || age;

  return (
    <div>
      <PageHeader
        eyebrow="Marketplace"
        title="Explore"
        titleAccent="businesses"
        subtitle="Verified businesses seeking their next owner. Search by name or location, filter by category, price and age, and save what catches your eye."
      />

      <section className="px-[4%] md:px-[2%] pb-24 md:pb-32">
        <div className="max-w-[1400px] mx-auto">
          {/* Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-14">
            <form
              onSubmit={(e) => { e.preventDefault(); setSearch(searchInput); }}
              className="sm:col-span-2 flex items-center border-b border-border pb-2"
            >
              <SearchIcon size={15} className="text-muted-foreground mr-3 shrink-0" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or location…"
                aria-label="Search businesses"
                className="flex-1 bg-transparent font-body text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            </form>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              aria-label="Filter by category"
              className="bg-transparent border-b border-border pb-2 font-body text-sm text-foreground focus:outline-none cursor-pointer"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>{c.name}</option>
              ))}
            </select>
            <select
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              aria-label="Filter by price"
              className="bg-transparent border-b border-border pb-2 font-body text-sm text-foreground focus:outline-none cursor-pointer"
            >
              {priceRanges.map((r) => (
                <option key={r.label} value={r.value}>{r.label}</option>
              ))}
            </select>
            <div className="flex gap-3">
              <select
                value={age}
                onChange={(e) => setAge(e.target.value)}
                aria-label="Filter by years in operation"
                className="flex-1 bg-transparent border-b border-border pb-2 font-body text-sm text-foreground focus:outline-none cursor-pointer"
              >
                {ageRanges.map((r) => (
                  <option key={r.label} value={r.value}>{r.label}</option>
                ))}
              </select>
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="Sort"
                className="flex-1 bg-transparent border-b border-border pb-2 font-body text-sm text-foreground focus:outline-none cursor-pointer"
              >
                {sorts.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {hasFilters && businesses?.length === 0 && !error && (
            <p className="font-body text-xs tracking-label uppercase text-muted-foreground mb-8">
              No results — try clearing filters
            </p>
          )}

          {error ? (
            <EmptyState
              title="Something went wrong."
              subtitle="We couldn't load the marketplace right now. Please try again in a moment."
              icon={SearchIcon}
            />
          ) : businesses === null ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, i) => (
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
    </div>
  );
}
