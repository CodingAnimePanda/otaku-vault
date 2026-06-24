// artifacts/media-tracker/src/pages/quotes.tsx
import React, { useState, useMemo } from "react";
import { useListMedia } from "@workspace/api-client-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Quote, Plus, Trash2, Search, Copy, Check, ExternalLink, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@clerk/clerk-react";

interface SavedQuote {
  id: number;
  quote: string;
  character: string;
  mediaTitle: string;
  category: string;
  context: string;
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

const QUOTE_ACCENT_COLORS = [
  "from-primary/10 border-primary/20",
  "from-accent/10 border-accent/20",
  "from-purple-500/10 border-purple-500/20",
  "from-rose-500/10 border-rose-500/20",
  "from-orange-500/10 border-orange-500/20",
  "from-blue-500/10 border-blue-500/20",
];

const API_BASE = import.meta.env.VITE_API_URL ?? "https://otakuvault-api.onrender.com";

function useApiHeaders() {
  const { getToken } = useAuth();
  return async () => {
    const token = await getToken();
    return { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) };
  };
}

// ── Add Quote Dialog ──────────────────────────────────────────────────────────
function AddQuoteDialog({ open, onClose, onAdd, libraryMedia }: {
  open: boolean; onClose: () => void;
  onAdd: (data: Omit<SavedQuote, "id" | "createdAt">) => void;
  libraryMedia: any[];
}) {
  const { toast } = useToast();
  const [quote, setQuote] = useState("");
  const [character, setCharacter] = useState("");
  const [mediaTitle, setMediaTitle] = useState("");
  const [category, setCategory] = useState("manhwa");
  const [context, setContext] = useState("");
  const [readingUrl, setReadingUrl] = useState("");

  const reset = () => { setQuote(""); setCharacter(""); setMediaTitle(""); setCategory("manhwa"); setContext(""); setReadingUrl(""); };
  React.useEffect(() => { if (!open) reset(); }, [open]);

  React.useEffect(() => {
    if (!mediaTitle.trim()) return;
    const match = libraryMedia.find((m) => m.title.toLowerCase() === mediaTitle.toLowerCase());
    if (match?.readingUrl) setReadingUrl(match.readingUrl);
    if (match?.category) setCategory(match.category);
  }, [mediaTitle, libraryMedia]);

  const titleSuggestions = mediaTitle.length > 1
    ? libraryMedia.filter((m) => m.title.toLowerCase().includes(mediaTitle.toLowerCase())).slice(0, 4)
    : [];

  const handleSubmit = () => {
    if (!quote.trim()) { toast({ title: "Quote text is required", variant: "destructive" }); return; }
    if (!mediaTitle.trim()) { toast({ title: "Media title is required", variant: "destructive" }); return; }
    onAdd({ quote, character, mediaTitle, category, context, readingUrl });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Quote className="w-5 h-5 text-primary" /> Save a Quote
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">The Quote</label>
            <Textarea placeholder='"I alone am the exception."' value={quote}
              onChange={(e) => setQuote(e.target.value)} rows={3} className="resize-none text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Character</label>
              <Input placeholder="e.g. Sung Jin-Woo" value={character} onChange={(e) => setCharacter(e.target.value)} />
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
          <div className="space-y-1.5 relative">
            <label className="text-sm font-medium">From</label>
            <Input placeholder="e.g. Solo Leveling" value={mediaTitle} onChange={(e) => setMediaTitle(e.target.value)} />
            {titleSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                {titleSuggestions.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMediaTitle(m.title)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2">
                    <span className="text-muted-foreground capitalize text-xs">{m.category}</span>
                    {m.title}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Scene context (optional)</label>
            <Input placeholder="e.g. Chapter 120, after the boss fight" value={context} onChange={(e) => setContext(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Reading Link (optional)</label>
            <div className="relative">
              <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input placeholder="https://..." value={readingUrl} onChange={(e) => setReadingUrl(e.target.value)} className="pl-9 text-xs" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!quote.trim() || !mediaTitle.trim()}>
              <Plus className="w-4 h-4 mr-1.5" /> Save Quote
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Quote Card ────────────────────────────────────────────────────────────────
function QuoteCard({ quote, onDelete, colorClass }: { quote: SavedQuote; onDelete: () => void; colorClass: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    const text = `"${quote.quote}"${quote.character ? ` — ${quote.character}` : ""}${quote.mediaTitle ? `, ${quote.mediaTitle}` : ""}`;
    navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };
  return (
    <div className={cn("group relative rounded-2xl bg-gradient-to-br to-transparent border p-5 transition-all hover:scale-[1.01]", colorClass)}>
      <div className="absolute top-3 left-4 text-6xl font-serif text-primary/10 leading-none select-none">"</div>
      <div className="relative space-y-3">
        <p className="text-sm leading-relaxed font-medium pt-4 italic">"{quote.quote}"</p>
        <div className="flex items-end justify-between gap-2">
          <div>
            {quote.character && <p className="text-xs font-semibold text-foreground/80">— {quote.character}</p>}
            <p className="text-xs text-muted-foreground mt-0.5">{quote.mediaTitle}</p>
            {quote.context && <p className="text-[10px] text-muted-foreground/70 mt-0.5 italic">{quote.context}</p>}
          </div>
          <span className={cn("text-[10px] font-medium px-2 py-0.5 rounded-full border capitalize flex-shrink-0", CATEGORY_COLORS[quote.category] ?? CATEGORY_COLORS.other)}>
            {quote.category}
          </span>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">{new Date(quote.createdAt).toLocaleDateString()}</span>
            {quote.readingUrl && (
              <a href={quote.readingUrl} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                <ExternalLink className="w-2.5 h-2.5" /> Go Read
              </a>
            )}
          </div>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button size="sm" variant="ghost" className="h-6 px-2 text-[10px] gap-1 hover:bg-primary/10 hover:text-primary" onClick={handleCopy}>
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied!" : "Copy"}
            </Button>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive" onClick={onDelete}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function QuotesPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const getHeaders = useApiHeaders();

  const { data: libraryData } = useListMedia({ listType: "library" });
  const libraryMedia = Array.isArray(libraryData) ? libraryData : [];

  const { data: quotes = [], isLoading } = useQuery<SavedQuote[]>({
    queryKey: ["quotes"],
    queryFn: async () => {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/quotes`, { headers });
      if (!res.ok) throw new Error("Failed to fetch quotes");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: Omit<SavedQuote, "id" | "createdAt">) => {
      const headers = await getHeaders();
      const res = await fetch(`${API_BASE}/api/quotes`, { method: "POST", headers, body: JSON.stringify(data) });
      if (!res.ok) throw new Error("Failed to save quote");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({ title: "Quote saved!" });
    },
    onError: () => toast({ title: "Failed to save quote", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const headers = await getHeaders();
      await fetch(`${API_BASE}/api/quotes/${id}`, { method: "DELETE", headers });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["quotes"] }),
    onError: () => toast({ title: "Failed to delete quote", variant: "destructive" }),
  });

  const filtered = useMemo(() => {
    let items = quotes;
    if (activeCategory) items = items.filter((q) => q.category === activeCategory);
    if (search.trim()) {
      const s = search.toLowerCase();
      items = items.filter((q) =>
        q.quote.toLowerCase().includes(s) ||
        q.character.toLowerCase().includes(s) ||
        q.mediaTitle.toLowerCase().includes(s)
      );
    }
    return items;
  }, [quotes, search, activeCategory]);

  return (
    <div className="space-y-6">
      <div className="relative rounded-2xl bg-gradient-to-br from-accent/10 via-primary/5 to-transparent border border-accent/20 p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-40 h-40 bg-accent/5 rounded-full -translate-y-10 translate-x-10 blur-2xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
              <Quote className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold">Quotes</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {quotes.length > 0 ? `${quotes.length} quote${quotes.length !== 1 ? "s" : ""} saved` : "Words that hit different"}
              </p>
            </div>
          </div>
          <Button onClick={() => setAddOpen(true)} className="gap-2 shadow-lg">
            <Plus className="w-4 h-4" /> Add Quote
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
          <Input placeholder="Search quotes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : quotes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Quote className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-display font-semibold text-xl mb-2">No quotes yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm mb-6">Save the lines that made you stop and reread them three times.</p>
            <Button onClick={() => setAddOpen(true)} className="gap-2"><Plus className="w-4 h-4" /> Add your first quote</Button>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm">No quotes match your search.</p>
          <button className="text-xs text-primary mt-2 hover:underline" onClick={() => { setSearch(""); setActiveCategory(null); }}>Clear filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((quote, idx) => (
            <QuoteCard key={quote.id} quote={quote} onDelete={() => deleteMutation.mutate(quote.id)}
              colorClass={QUOTE_ACCENT_COLORS[idx % QUOTE_ACCENT_COLORS.length]} />
          ))}
        </div>
      )}

      <AddQuoteDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={(data) => addMutation.mutate(data)} libraryMedia={libraryMedia} />
    </div>
  );
}