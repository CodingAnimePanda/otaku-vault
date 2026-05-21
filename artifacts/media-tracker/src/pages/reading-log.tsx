// artifacts/media-tracker/src/pages/reading-log.tsx
import React, { useState, useMemo } from "react";
import { useListMedia } from "@workspace/api-client-react";
import { BookOpen, Plus, Trash2, Search, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────
interface LogEntry {
  id: string;
  mediaId: number;
  mediaTitle: string;
  mediaCategory: string;
  mediaReadingUrl?: string;
  chapter: string;
  note: string;
  date: string; // ISO string
}

// ── Storage ───────────────────────────────────────────────────────────────────
function loadLog(): LogEntry[] {
  try { const s = localStorage.getItem("ov_reading_log"); if (s) return JSON.parse(s); } catch {}
  return [];
}
function saveLog(entries: LogEntry[]) {
  try { localStorage.setItem("ov_reading_log", JSON.stringify(entries)); } catch {}
}

const CATEGORY_COLORS: Record<string, string> = {
  webtoon: "text-blue-400 bg-blue-500/10",
  manhwa: "text-purple-400 bg-purple-500/10",
  manhua: "text-emerald-400 bg-emerald-500/10",
  manga: "text-orange-400 bg-orange-500/10",
  anime: "text-pink-400 bg-pink-500/10",
};

// ── Add Entry Dialog ──────────────────────────────────────────────────────────
function AddEntryDialog({ open, onClose, onAdd, media }: {
  open: boolean; onClose: () => void;
  onAdd: (entry: Omit<LogEntry, "id">) => void;
  media: any[];
}) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [chapter, setChapter] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const filtered = useMemo(() => {
    if (!search.trim()) return media.slice(0, 8);
    return media.filter((m) => m.title.toLowerCase().includes(search.toLowerCase())).slice(0, 8);
  }, [media, search]);

  const handleAdd = () => {
    if (!selected) return;
    onAdd({
      mediaId: selected.id,
      mediaTitle: selected.title,
      mediaCategory: selected.category,
      mediaReadingUrl: selected.readingUrl ?? undefined,
      chapter: chapter.trim(),
      note: note.trim(),
      date: new Date(date).toISOString(),
    });
    setSearch(""); setSelected(null); setChapter(""); setNote("");
    setDate(new Date().toISOString().slice(0, 10));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Log Reading Session</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Media picker */}
          {!selected ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Title</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search your library..." value={search}
                  onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border bg-card p-1">
                {filtered.map((m) => (
                  <button key={m.id} onClick={() => setSelected(m)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-muted transition-colors text-left">
                    <div className="w-8 h-10 flex-shrink-0 rounded overflow-hidden bg-muted">
                      {m.coverUrl ? <img src={m.coverUrl} alt={m.title} className="w-full h-full object-cover" />
                        : <BookOpen className="w-4 h-4 m-2 text-muted-foreground/30" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium line-clamp-1">{m.title}</p>
                      <p className={cn("text-xs capitalize", CATEGORY_COLORS[m.category]?.split(" ")[0])}>{m.category}</p>
                    </div>
                  </button>
                ))}
                {filtered.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No results</p>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted border border-border">
              <div className="w-10 h-14 flex-shrink-0 rounded overflow-hidden bg-muted">
                {selected.coverUrl ? <img src={selected.coverUrl} alt={selected.title} className="w-full h-full object-cover" />
                  : <BookOpen className="w-4 h-4 m-3 text-muted-foreground/30" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm line-clamp-1">{selected.title}</p>
                <p className={cn("text-xs capitalize", CATEGORY_COLORS[selected.category]?.split(" ")[0])}>{selected.category}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Change</button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Chapter / Episode</label>
              <Input placeholder="e.g. Ch. 42" value={chapter} onChange={(e) => setChapter(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Date</label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Note <span className="text-muted-foreground font-normal text-xs">(optional)</span></label>
            <Input placeholder="What happened? Quick thought?" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          <div className="flex gap-3 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1" disabled={!selected} onClick={handleAdd}>Add Entry</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReadingLogPage() {
  const { data: media } = useListMedia({ listType: "library" });
  const mediaArray = Array.isArray(media) ? media : [];
  const [log, setLog] = useState<LogEntry[]>(loadLog);
  const [addOpen, setAddOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [filterMedia, setFilterMedia] = useState<number | null>(null);
  const { toast } = useToast();

  const handleAdd = (entry: Omit<LogEntry, "id">) => {
    const newEntry: LogEntry = { ...entry, id: `${Date.now()}-${Math.random()}` };
    const updated = [newEntry, ...log];
    setLog(updated); saveLog(updated);
    toast({ title: "Logged!", description: `Reading session saved for ${entry.mediaTitle}.` });
  };

  const handleDelete = (id: string) => {
    const updated = log.filter((e) => e.id !== id);
    setLog(updated); saveLog(updated);
  };

  const filtered = useMemo(() => {
    let entries = log;
    if (filterMedia !== null) entries = entries.filter((e) => e.mediaId === filterMedia);
    if (search.trim()) {
      const q = search.toLowerCase();
      entries = entries.filter((e) =>
        e.mediaTitle.toLowerCase().includes(q) ||
        e.chapter.toLowerCase().includes(q) ||
        e.note.toLowerCase().includes(q)
      );
    }
    return entries;
  }, [log, filterMedia, search]);

  // Group by date (YYYY-MM-DD)
  const grouped = useMemo(() => {
    const groups: Record<string, LogEntry[]> = {};
    filtered.forEach((e) => {
      const day = e.date.slice(0, 10);
      if (!groups[day]) groups[day] = [];
      groups[day].push(e);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // Unique titles in log for filter
  const loggedTitles = useMemo(() => {
    const seen = new Set<number>();
    return log.filter((e) => { if (seen.has(e.mediaId)) return false; seen.add(e.mediaId); return true; });
  }, [log]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    const entry = new Date(iso); entry.setHours(0, 0, 0, 0);
    if (entry.getTime() === today.getTime()) return "Today";
    if (entry.getTime() === yesterday.getTime()) return "Yesterday";
    return d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">Reading Log</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {log.length > 0 ? `${log.length} session${log.length !== 1 ? "s" : ""} logged` : "Track every reading session"}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Log Session
        </Button>
      </div>

      {/* Filter bar */}
      {log.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search log..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button onClick={() => setFilterMedia(null)}
              className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                filterMedia === null ? "bg-primary text-primary-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground")}>
              All
            </button>
            {loggedTitles.slice(0, 5).map((e) => (
              <button key={e.mediaId} onClick={() => setFilterMedia(e.mediaId)}
                className={cn("px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
                  filterMedia === e.mediaId ? "bg-primary text-primary-foreground border-transparent" : "border-border text-muted-foreground hover:text-foreground")}>
                {e.mediaTitle.length > 16 ? e.mediaTitle.slice(0, 16) + "…" : e.mediaTitle}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Log entries grouped by date */}
      {grouped.length > 0 ? (
        <div className="space-y-6">
          {grouped.map(([day, entries]) => (
            <div key={day}>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-muted-foreground">{formatDate(day)}</h3>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{entries.length} session{entries.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div key={entry.id}
                    className="group flex items-start gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-primary/20 transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{entry.mediaTitle}</span>
                        <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize",
                          CATEGORY_COLORS[entry.mediaCategory] ?? "bg-muted text-muted-foreground")}>
                          {entry.mediaCategory}
                        </span>
                        {entry.chapter && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {entry.chapter}
                          </span>
                        )}
                      </div>
                      {entry.note && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{entry.note}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/50 mt-1">
                        {new Date(entry.date).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      {entry.mediaReadingUrl && (
                        <a href={entry.mediaReadingUrl} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button onClick={() => handleDelete(entry.id)}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-xl mb-2">No sessions logged yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mb-6">
            Log your reading sessions to track your progress over time.
          </p>
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Log your first session
          </Button>
        </div>
      )}

      <AddEntryDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={handleAdd} media={mediaArray} />
    </div>
  );
}