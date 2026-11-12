import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
import { useToast } from "@/lib/ToastContext";
import PageHeader from "@/components/common/PageHeader";
import EmptyState from "@/components/common/EmptyState";
import { categoryService } from "@/services/listingService";

export default function AdminCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState(null);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState("");

  const load = async () => {
    try {
      const res = await categoryService.getAll();
      const items = Array.isArray(res.data) ? res.data : res.data.results || [];
      setCategories(items);
    } catch (err) {
      setCategories([]);
    }
  };

  useEffect(() => { load(); }, []);

  const add = async (e) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    try {
      await categoryService.create({ name, description: newDesc.trim() });
      setNewName("");
      setNewDesc("");
      toast({ description: `Category "${name}" added.` });
      load();
    } catch (err) {
      toast({ description: "Could not add the category.", variant: "destructive" });
    }
  };

  const saveEdit = async (c) => {
    const name = editName.trim();
    if (!name) return;
    try {
      await categoryService.update(c.id, { name });
      toast({ description: "Category updated." });
      setEditing(null);
      load();
    } catch (err) {
      toast({ description: "Could not update the category.", variant: "destructive" });
    }
  };

  const remove = async (c) => {
    if (!window.confirm(`Remove category "${c.name}"? Businesses already using it keep their label.`)) return;
    try {
      await categoryService.delete(c.id);
      toast({ description: "Category removed." });
      load();
    } catch (err) {
      toast({ description: "Could not remove the category.", variant: "destructive" });
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Business"
        titleAccent="categories"
        subtitle="The categories sellers choose from when listing. Add, rename or remove them as the marketplace evolves."
      />
      <section className="px-[4%] md:px-[2%] pb-24">
        <div className="max-w-3xl mx-auto">
          <form onSubmit={add} className="border border-border p-8 mb-12">
            <p className="font-body text-xs tracking-label uppercase text-accent mb-6">Add a category</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Category name…"
                aria-label="New category name"
                className="flex-1 bg-transparent border-b border-border pb-2 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
              />
              <input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Optional description"
                aria-label="New category description"
                className="flex-1 bg-transparent border-b border-border pb-2 font-body text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent"
              />
              <button
                type="submit"
                className="font-body text-xs tracking-label uppercase px-6 py-3 rounded-full border border-foreground bg-foreground text-background hover:bg-foreground/80 transition-colors inline-flex items-center gap-2 self-start"
              >
                <Plus size={13} /> Add
              </button>
            </div>
          </form>

          {categories === null ? (
            <div className="space-y-4">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-secondary animate-pulse rounded" />)}</div>
          ) : categories.length === 0 ? (
            <EmptyState title="No categories yet." subtitle="Add your first category above — sellers will pick from this list." icon={Tags} />
          ) : (
            <div className="divide-y divide-border border-t border-b border-border">
              {categories.map((c) => (
                <div key={c.id} className="py-4 flex items-center justify-between gap-4">
                  {editing === c.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && saveEdit(c)}
                      autoFocus
                      aria-label="Edit category name"
                      className="flex-1 bg-transparent border-b border-accent pb-1 font-body text-sm focus:outline-none"
                    />
                  ) : (
                    <div>
                      <p className="font-body text-sm text-foreground">{c.name}</p>
                      {c.description && <p className="font-body text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    {editing === c.id ? (
                      <button onClick={() => saveEdit(c)} className="font-body text-xs tracking-label uppercase text-accent hover:underline">Save</button>
                    ) : (
                      <button onClick={() => { setEditing(c.id); setEditName(c.name); }} aria-label={`Rename ${c.name}`} className="p-2 text-muted-foreground hover:text-foreground transition-colors">
                        <Pencil size={14} />
                      </button>
                    )}
                    <button onClick={() => remove(c)} aria-label={`Delete ${c.name}`} className="p-2 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
