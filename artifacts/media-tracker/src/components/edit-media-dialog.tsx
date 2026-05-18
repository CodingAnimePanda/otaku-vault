// artifacts/media-tracker/src/components/edit-media-dialog.tsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useUpdateMedia,
  getListMediaQueryKey,
  getGetMediaStatsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ExternalLink, Link, Pencil, Heart } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUSES = ["reading", "watching", "completed", "paused", "dropped", "plan_to_read"] as const;
const LIST_TYPES = ["library", "to_read", "avoid"] as const;

interface ReadingSite { label: string; url: string; emoji: string; }
const DEFAULT_SITES: ReadingSite[] = [
  { label: "Webtoon",   url: "https://www.webtoons.com", emoji: "📱" },
  { label: "MangaFire", url: "https://mangafire.to",     emoji: "🔥" },
  { label: "VyManga",   url: "https://vymanga.com",      emoji: "📚" },
];
function loadSites(): ReadingSite[] {
  try {
    const stored = localStorage.getItem("ov_reading_sites");
    if (stored) return JSON.parse(stored);
  } catch {}
  return DEFAULT_SITES;
}

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  status: z.enum(STATUSES).optional(),
  listType: z.enum(LIST_TYPES),
  currentChapter: z.string().optional(),
  notes: z.string().optional(),
  coverUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  readingUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

interface MediaItem {
  id: number;
  title: string;
  category: string;
  listType: string;
  status?: string | null;
  currentChapter?: string | null;
  notes?: string | null;
  coverUrl?: string | null;
  readingUrl?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  media: MediaItem | null;
  favorites?: Set<number>;
  onToggleFavorite?: (id: number) => void;
  dropReasons?: Record<number, string>;
  onSaveDropReason?: (id: number, reason: string) => void;
}

export function EditMediaDialog({ open, onClose, media, favorites, onToggleFavorite, dropReasons, onSaveDropReason }: Props) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateMedia = useUpdateMedia();
  const readingSites = loadSites();
  const [dropReason, setDropReason] = useState("");

  const isFavorite = media ? (favorites?.has(media.id) ?? false) : false;
  const watchedStatus = useForm<FormValues>().watch;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "", status: undefined, listType: "library",
      currentChapter: "", notes: "", coverUrl: "", readingUrl: "",
    },
  });

  const currentStatus = form.watch("status");

  useEffect(() => {
    if (media && open) {
      form.reset({
        title: media.title,
        status: (media.status as any) ?? undefined,
        listType: (media.listType as any) ?? "library",
        currentChapter: media.currentChapter ?? "",
        notes: media.notes ?? "",
        coverUrl: media.coverUrl ?? "",
        readingUrl: (media as any).readingUrl ?? "",
      });
      setDropReason(dropReasons?.[media.id] ?? "");
    }
  }, [media, open]);

  useEffect(() => { if (!open) form.reset(); }, [open]);

  const watchedReadingUrl = form.watch("readingUrl");

  const onSubmit = (values: FormValues) => {
    if (!media) return;
    // Save drop reason if status is dropped
    if (values.status === "dropped" && onSaveDropReason) {
      onSaveDropReason(media.id, dropReason);
    }
    updateMedia.mutate(
      {
        id: media.id,
        data: {
          title: values.title,
          status: (values.status as any) ?? null,
          listType: values.listType as any,
          currentChapter: values.currentChapter || null,
          notes: values.notes || null,
          coverUrl: values.coverUrl || null,
          readingUrl: values.readingUrl || null,
        } as any,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMediaStatsQueryKey() });
          toast({ title: "Updated!", description: `${values.title} has been updated.` });
          onClose();
        },
        onError: () => {
          toast({ title: "Error", description: "Failed to update. Please try again.", variant: "destructive" });
        },
      }
    );
  };

  if (!media) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Pencil className="w-4 h-4 text-primary" />
            Edit Title
          </DialogTitle>
        </DialogHeader>

        {/* Favorite toggle */}
        <button
          type="button"
          onClick={() => onToggleFavorite?.(media.id)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all w-full",
            isFavorite
              ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
              : "bg-card border-border text-muted-foreground hover:text-rose-400 hover:border-rose-500/30"
          )}
        >
          <Heart className={cn("w-4 h-4", isFavorite && "fill-rose-400")} />
          {isFavorite ? "Saved as Favorite" : "Mark as Favorite"}
        </button>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="listType" render={({ field }) => (
                <FormItem>
                  <FormLabel>List</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="library">Library</SelectItem>
                      <SelectItem value="to_read">To-Read</SelectItem>
                      <SelectItem value="avoid">Avoid List</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="No status" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>

            {/* Drop reason — only shown when status is dropped */}
            {currentStatus === "dropped" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-red-400">Drop Reason (optional)</label>
                <Textarea
                  placeholder="Why did you drop this? e.g. Lost interest after chapter 30, art style changed..."
                  value={dropReason}
                  onChange={(e) => setDropReason(e.target.value)}
                  rows={2}
                  className="resize-none text-sm border-red-500/20 focus:border-red-500/40"
                />
              </div>
            )}

            <FormField control={form.control} name="currentChapter" render={({ field }) => (
              <FormItem>
                <FormLabel>Current Chapter/Episode</FormLabel>
                <FormControl><Input placeholder="e.g. Chapter 45 or S2 Ep7" {...field} /></FormControl>
              </FormItem>
            )} />

            {/* Reading Link */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Link className="w-3.5 h-3.5 text-muted-foreground" />
                <p className="text-sm font-medium">Reading Link</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                {readingSites.map((site) => (
                  <button key={site.label} type="button"
                    onClick={() => form.setValue("readingUrl", site.url)}
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                      watchedReadingUrl?.startsWith(site.url)
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-card border-border text-muted-foreground hover:text-foreground"
                    )}>
                    {site.emoji} {site.label}
                  </button>
                ))}
              </div>
              <FormField control={form.control} name="readingUrl" render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className="relative">
                      <ExternalLink className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input placeholder="https://..." {...field} className="pl-9 text-xs" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {watchedReadingUrl && (
                <a href={watchedReadingUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                  <ExternalLink className="w-3 h-3" /> Test link
                </a>
              )}
            </div>

            <FormField control={form.control} name="coverUrl" render={({ field }) => (
              <FormItem>
                <FormLabel>Cover URL</FormLabel>
                <FormControl><Input placeholder="https://..." {...field} className="text-xs" /></FormControl>
                <FormMessage />
                {field.value && (
                  <img src={field.value} alt="Cover preview" className="w-12 h-16 object-cover rounded-md mt-1 border border-border" />
                )}
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Any notes..." className="resize-none text-sm" rows={2} {...field} />
                </FormControl>
              </FormItem>
            )} />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={updateMedia.isPending}>
                {updateMedia.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}