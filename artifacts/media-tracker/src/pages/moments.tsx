// artifacts/media-tracker/src/pages/moments.tsx
import React, { useState, useMemo, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Plus, Trash2, Search, X, Upload, Link, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Moment {
  id: string;
  title: string;       // media title
  scene: string;       // scene/character name
  category: "webtoon" | "manhwa" | "manga" | "anime" | "other";
  notes: string;
  imageUrl: string;    // either a URL or base64 data URI
  createdAt: string;
}

const CATEGORIES = ["webtoon", "manhwa", "manga", "anime", "other"] as const;

const CATEGORY_COLORS: Record<string, string> = {
  webtoon: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  manhwa:  "text-purple-400 bg-purple-500/10 border-purple-500/20",
  manga:   "text-orange-400 bg-orange-500/10 border-orange-500/20",
  anime:   "text-pink-400 bg-pink-500/10 border-pink-500/20",
  other:   "text-muted-foreground bg-muted border-border",
};

// ── Storage ───────────────────────────────────────────────────────────────────
function loadMoments(): Moment[] {
  try {
    const stored = localStorage.getItem("ov_moments");
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

function saveMoments(moments: Moment[]) {
  try { localStorage.setItem("ov_moments", JSON.stringify(moments)); } catch {}
}

// ── Add Moment Dialog ─────────────────────────────────────────────────────────
function AddMomentDialog({ open, onClose, onAdd }: {
  open: boolean;
  onClose: () => void;
  onAdd: (moment: Omit<Moment, "id" | "createdAt">) => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [scene, setScene] = useState("");
  const [category, setCategory] = useState<Moment["category"]>("manhwa");
  const [notes, setNotes] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageTab, setImageTab] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setTitle(""); setScene(""); setCategory("manhwa");
    setNotes(""); setImageUrl(""); setImageTab("url");
  };

  React.useEffect(() => { if (!open) reset(); }, [open]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please use an image under 5MB.", variant: "destructive" });
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    onAdd({ title, scene, category, notes, imageUrl });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Add a Favorite Moment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium">Media Title</label>
              <Input placeholder="e.g. Solo Leveling" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Scene / Character</label>
              <Input placeholder="e.g. Sung Jin-Woo awakens" value={scene} onChange={(e) => setScene(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={(v) => setCategory(v as Moment["category"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea
              placeholder="Why does this moment hit so hard? What makes it special?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none text-sm"
            />
          </div>

          {/* Image section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Image (optional)</label>
            <div className="flex gap-2">
              <button
                onClick={() => setImageTab("url")}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  imageTab === "url" ? "bg-primary text-primary-foreground border-transparent" : "bg-card border-border text-muted-foreground"
                )}
              >
                <Link className="w-3 h-3" /> Paste URL
              </button>
              <button
                onClick={() => setImageTab("upload")}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  imageTab === "upload" ? "bg-primary text-primary-foreground border-transparent" : "bg-card border-border text-muted-foreground"
                )}
              >
                <Upload className="w-3 h-3" /> Upload File
              </button>
            </div>

            {imageTab === "url" ? (
              <Input
                placeholder="https://i.imgur.com/example.jpg"
                value={imageUrl.startsWith("data:") ? "" : imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="text-xs"
              />
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
              >
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
                {uploading ? (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                ) : imageUrl.startsWith("data:") ? (
                  <div className="flex flex-col items-center gap-2">
                    <img src={imageUrl} alt="Preview" className="max-h-32 rounded-lg object-contain" />
                    <p className="text-xs text-green-400">Image uploaded!</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-8 h-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Click to upload an image</p>
                    <p className="text-xs text-muted-foreground/60">PNG, JPG, GIF up to 5MB</p>
                  </div>
                )}
              </div>
            )}

            {/* Preview for URL */}
            {imageUrl && !imageUrl.startsWith("data:") && imageTab === "url" && (
              <img src={imageUrl} alt="Preview" className="max-h-32 rounded-lg object-contain border border-border" />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!title.trim()}>
              <Plus className="w-4 h-4 mr-1.5" />
              Save Moment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MomentsPage() {
  const [moments, setMoments] = useState<Moment[]>(loadMoments);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleAdd = (data: Omit<Moment, "id" | "createdAt">) => {
    const newMoment: Moment = {
      ...data,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    const updated = [newMoment, ...moments];
    setMoments(updated);
    saveMoments(updated);
  };

  const handleDelete = (id: string) => {
    const updated = moments.filter((m) => m.id !== id);
    setMoments(updated);
    saveMoments(updated);
  };

  const filtered = useMemo(() => {
    let items = moments;
    if (activeCategory) items = items.filter((m) => m.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((m) =>
        m.title.toLowerCase().includes(q) ||
        m.scene.toLowerCase().includes(q) ||
        m.notes.toLowerCase().includes(q)
      );
    }
    return items;
  }, [moments, search, activeCategory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-primary/20 p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-10 translate-x-10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">Favorite Moments</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {moments.length > 0 ? `${moments.length} moment${moments.length !== 1 ? "s" : ""} saved` : "The scenes that live rent-free in your head"}
              </p>
            </div>
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-2 shadow-lg">
            <Plus className="w-4 h-4" />
            Add Moment
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setActiveCategory(null)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              !activeCategory ? "bg-primary text-primary-foreground border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"
            )}>All</button>
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border capitalize transition-all",
                activeCategory === cat ? "bg-primary text-primary-foreground border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"
              )}>{cat}</button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search moments..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
      </div>

      {/* Moments grid */}
      {moments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-display font-semibold text-xl mb-2">No moments yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">
              Save the scenes, panels, and moments that hit different. You know the ones.
            </p>
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Add your first moment
            </Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm">No moments match your search.</p>
          <button className="text-xs text-primary mt-2 hover:underline" onClick={() => { setSearch(""); setActiveCategory(null); }}>Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((moment) => (
            <div key={moment.id}
              className="group rounded-2xl bg-card border border-border hover:border-primary/30 transition-all overflow-hidden">
              {/* Image */}
              {moment.imageUrl && (
                <div className="aspect-video overflow-hidden bg-muted">
                  <img
                    src={moment.imageUrl}
                    alt={moment.scene || moment.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                </div>
              )}
              {!moment.imageUrl && (
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/5 flex items-center justify-center">
                  <ImageIcon className="w-10 h-10 text-muted-foreground/20" />
                </div>
              )}

              {/* Content */}
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-sm leading-tight">{moment.title}</h3>
                    {moment.scene && (
                      <p className="text-xs text-primary/80 mt-0.5">{moment.scene}</p>
                    )}
                  </div>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 capitalize", CATEGORY_COLORS[moment.category])}>
                    {moment.category}
                  </span>
                </div>

                {moment.notes && (
                  <div>
                    <p className={cn("text-xs text-muted-foreground leading-relaxed", expanded === moment.id ? "" : "line-clamp-3")}>
                      {moment.notes}
                    </p>
                    {moment.notes.length > 120 && (
                      <button
                        onClick={() => setExpanded(expanded === moment.id ? null : moment.id)}
                        className="text-[10px] text-primary hover:underline mt-1"
                      >
                        {expanded === moment.id ? "Show less" : "Read more"}
                      </button>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(moment.createdAt).toLocaleDateString()}
                  </span>
                  <Button size="sm" variant="ghost"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                    onClick={() => handleDelete(moment.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddMomentDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} />
    </div>
  );
}