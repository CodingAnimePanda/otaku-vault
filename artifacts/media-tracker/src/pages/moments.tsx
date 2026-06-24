// artifacts/media-tracker/src/pages/moments.tsx
import React, { useState, useMemo, useRef } from "react";
import { useListMedia } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, Plus, Trash2, Search, Upload, Link as LinkIcon,
  ImageIcon, ExternalLink, ChevronLeft, ChevronRight, X, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";

interface Moment {
  id: number;
  title: string;
  scene: string;
  category: string;
  notes: string;
  images: string[];
  chapter: string;
  page: string;
  readingUrl: string;
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

const API_BASE = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";

function useApiHeaders() {
  const { getToken } = useAuth();
  return async () => {
    const token = await getToken();
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };
}

// ── Image Gallery ─────────────────────────────────────────────────────────────
function ImageGallery({ images }: { images: string[] }) {
  const [idx, setIdx] = useState(0);
  if (!images.length) return (
    <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/5 flex items-center justify-center">
      <ImageIcon className="w-10 h-10 text-muted-foreground/20" />
    </div>
  );
  return (
    <div className="relative aspect-video overflow-hidden bg-muted group/gallery">
      <img src={images[idx]} alt={`Image ${idx + 1}`} className="w-full h-full object-cover"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      {images.length > 1 && (
        <>
          <button onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
            className="absolute left-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 group-hover/gallery:opacity-100 transition-opacity hover:bg-black/70">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setIdx((i) => (i + 1) % images.length)}
            className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white opacity-0 group-hover/gallery:opacity-100 transition-opacity hover:bg-black/70">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, i) => (
              <button key={i} onClick={() => setIdx(i)}
                className={cn("w-1.5 h-1.5 rounded-full transition-all", i === idx ? "bg-white" : "bg-white/40")} />
            ))}
          </div>
          <span className="absolute top-2 right-2 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">
            {idx + 1}/{images.length}
          </span>
        </>
      )}
    </div>
  );
}

// ── Add Moment Dialog ─────────────────────────────────────────────────────────
function AddMomentDialog({ open, onClose, onAdd, libraryMedia }: {
  open: boolean; onClose: () => void;
  onAdd: (data: Omit<Moment, "id" | "createdAt">) => void;
  libraryMedia: any[];
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [scene, setScene] = useState("");
  const [category, setCategory] = useState("manhwa");
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [imageTab, setImageTab] = useState<"url" | "upload">("url");
  const [urlInput, setUrlInput] = useState("");
  const [chapter, setChapter] = useState("");
  const [page, setPage] = useState("");
  const [readingUrl, setReadingUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setTitle(""); setScene(""); setCategory("manhwa"); setNotes("");
    setImages([]); setUrlInput(""); setChapter(""); setPage(""); setReadingUrl("");
  };
  React.useEffect(() => { if (!open) reset(); }, [open]);

  React.useEffect(() => {
    if (!title.trim()) return;
    const match = libraryMedia.find((m) => m.title.toLowerCase() === title.toLowerCase());
    if (match?.readingUrl) setReadingUrl(match.readingUrl);
    if (match?.category) setCategory(match.category);
  }, [title, libraryMedia]);

  const handleAddUrl = () => {
    if (!urlInput.trim()) return;
    setImages((prev) => [...prev, urlInput.trim()]);
    setUrlInput("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const tooBig = files.find((f) => f.size > 5 * 1024 * 1024);
    if (tooBig) { toast({ title: "File too large", description: "Each image must be under 5MB.", variant: "destructive" }); return; }
    setUploading(true);
    let done = 0;
    const results: string[] = [];
    files.forEach((file, i) => {
      const reader = new FileReader();
      reader.onload = () => {
        results[i] = reader.result as string;
        done++;
        if (done === files.length) { setImages((prev) => [...prev, ...results]); setUploading(false); }
      };
      reader.readAsDataURL(file);
    });
  };

  const titleSuggestions = title.length > 1
    ? libraryMedia.filter((m) => m.title.toLowerCase().includes(title.toLowerCase())).slice(0, 4)
    : [];

  const handleSubmit = () => {
    if (!title.trim()) { toast({ title: "Title is required", variant: "destructive" }); return; }
    onAdd({ title, scene, category, notes, images, chapter, page, readingUrl });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> Add a Favorite Moment
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5 relative">
            <label className="text-sm font-medium">Media Title</label>
            <Input placeholder="e.g. Solo Leveling" value={title} onChange={(e) => setTitle(e.target.value)} />
            {titleSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                {titleSuggestions.map((m) => (
                  <button key={m.id} type="button" onClick={() => setTitle(m.title)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2">
                    <span className="text-muted-foreground capitalize text-xs">{m.category}</span>
                    {m.title}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Scene / Character</label>
              <Input placeholder="e.g. Sung Jin-Woo awakens" value={scene} onChange={(e) => setScene(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Category</label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Chapter (optional)</label>
              <Input placeholder="e.g. 120" value={chapter} onChange={(e) => setChapter(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-muted-foreground">Page (optional)</label>
              <Input placeholder="e.g. 14" value={page} onChange={(e) => setPage(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Reading Link (optional)</label>
            <div className="relative">
              <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="https://..." value={readingUrl} onChange={(e) => setReadingUrl(e.target.value)} className="pl-9 text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Notes</label>
            <Textarea placeholder="Why does this moment hit so hard?" value={notes}
              onChange={(e) => setNotes(e.target.value)} rows={3} className="resize-none text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Images (optional)</label>
            <div className="flex gap-2">
              <button onClick={() => setImageTab("url")}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  imageTab === "url" ? "bg-primary text-primary-foreground border-transparent" : "bg-card border-border text-muted-foreground")}>
                <LinkIcon className="w-3 h-3" /> Paste URL
              </button>
              <button onClick={() => setImageTab("upload")}
                className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  imageTab === "upload" ? "bg-primary text-primary-foreground border-transparent" : "bg-card border-border text-muted-foreground")}>
                <Upload className="w-3 h-3" /> Upload Files
              </button>
            </div>
            {imageTab === "url" ? (
              <div className="flex gap-2">
                <Input placeholder="https://i.imgur.com/example.jpg" value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddUrl(); } }}
                  className="text-xs flex-1" />
                <Button type="button" size="sm" onClick={handleAddUrl} disabled={!urlInput.trim()}>Add</Button>
              </div>
            ) : (
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all">
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
                {uploading ? <p className="text-sm text-muted-foreground">Loading...</p> : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-6 h-6 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Click to upload images</p>
                    <p className="text-xs text-muted-foreground/60">Multiple files, up to 5MB each</p>
                  </div>
                )}
              </div>
            )}
            {images.length > 0 && (
              <div className="flex gap-2 flex-wrap mt-1">
                {images.map((img, i) => (
                  <div key={i} className="relative group/img">
                    <img src={img} alt={`img ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-border" />
                    <button onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-destructive rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!title.trim()}>
              <Plus className="w-4 h-4 mr-1.5" /> Save Moment
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function MomentsPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const getHeaders = useApiHeaders();

  const { data: libraryData } = useListMedia({ listType: "library" });
  const libraryMedia = Array.isArray(libraryData) ? libraryData : [];

  const { data: moments = [], isLoading } = useQuery<Moment[]>({
    queryKey: ["moments"],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/moments`, { headers });
      if (!res.ok) throw new Error("Failed to fetch moments");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: Omit<Moment, "id" | "createdAt">) => {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/moments`, { method: "POST", headers, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to save moment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["moments"] });
      toast({ title: "Moment saved!" });
    },
    onError: () => toast({ title: "Failed to save moment", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const headers = await getHeaders();
      await fetch(`${API_BASE}/api/moments/${id}`, { method: "DELETE", headers });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["moments"] }),
    onError: () => toast({ title: "Failed to delete moment", variant: "destructive" }),
  });

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
            <Plus className="w-4 h-4" /> Add Moment
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          <button onClick={() => setActiveCategory(null)}
            className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
              !activeCategory ? "bg-primary text-primary-foreground border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground")}>All</button>
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

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : moments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-display font-semibold text-xl mb-2">No moments yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">Save the scenes, panels, and moments that hit different.</p>
            <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Add your first moment</Button>
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
            <div key={moment.id} className="group rounded-2xl bg-card border border-border hover:border-primary/30 transition-all overflow-hidden">
              <ImageGallery images={moment.images} />
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-sm leading-tight">{moment.title}</h3>
                    {moment.scene && <p className="text-xs text-primary/80 mt-0.5">{moment.scene}</p>}
                    {(moment.chapter || moment.page) && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {moment.chapter && `Ch. ${moment.chapter}`}
                        {moment.chapter && moment.page && " · "}
                        {moment.page && `Pg. ${moment.page}`}
                      </p>
                    )}
                  </div>
                  <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 capitalize", CATEGORY_COLORS[moment.category] ?? CATEGORY_COLORS.other)}>
                    {moment.category}
                  </span>
                </div>
                {moment.notes && (
                  <div>
                    <p className={cn("text-xs text-muted-foreground leading-relaxed", expanded === moment.id ? "" : "line-clamp-3")}>
                      {moment.notes}
                    </p>
                    {moment.notes.length > 120 && (
                      <button onClick={() => setExpanded(expanded === moment.id ? null : moment.id)}
                        className="text-[10px] text-primary hover:underline mt-1">
                        {expanded === moment.id ? "Show less" : "Read more"}
                      </button>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{new Date(moment.createdAt).toLocaleDateString()}</span>
                    {moment.readingUrl && (
                      <a href={moment.readingUrl} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                        <ExternalLink className="w-2.5 h-2.5" /> Go Read
                      </a>
                    )}
                  </div>
                  <Button size="sm" variant="ghost"
                    className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                    onClick={() => deleteMutation.mutate(moment.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddMomentDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={(data) => addMutation.mutate(data)} libraryMedia={libraryMedia} />
    </div>
  );
}