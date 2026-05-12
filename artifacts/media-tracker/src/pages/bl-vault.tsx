import React, { useState } from "react";
import {
  useListMedia,
  useDeleteMedia,
  useUpdateMedia,
  getListMediaQueryKey,
  getGetMediaStatsQueryKey,
  useCreateMedia,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { Heart, Lock, Plus, Trash2, BookOpen, Loader2, Search, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn, proxyImage } from "@/lib/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useSearchCover,
  getSearchCoverQueryKey,
} from "@workspace/api-client-react";

const CATEGORIES = ["webtoon", "manhwa", "manga", "anime"] as const;
const STATUSES = ["reading", "watching", "completed", "paused", "dropped", "plan_to_read"] as const;

const addSchema = z.object({
  title: z.string().min(1, "Title is required"),
  category: z.enum(CATEGORIES),
  status: z.enum(STATUSES).optional(),
  notes: z.string().optional(),
  currentChapter: z.string().optional(),
  customCoverUrl: z.string().url("Must be a valid URL").optional().or(z.literal("")),
});
type AddFormValues = z.infer<typeof addSchema>;

const STATUS_LABELS: Record<string, string> = {
  reading: "Reading",
  watching: "Watching",
  completed: "Completed",
  paused: "Paused",
  dropped: "Dropped",
  plan_to_read: "Plan to read",
};

function AddBLDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCover, setSelectedCover] = useState<string | null>(null);
  const [coverSearch, setCoverSearch] = useState<{ title: string; category: string } | null>(null);

  const form = useForm<AddFormValues>({
    resolver: zodResolver(addSchema),
    defaultValues: { title: "", category: "manhwa", status: undefined, notes: "", currentChapter: "", customCoverUrl: "" },
  });

  const watchedTitle = form.watch("title");
  const watchedCategory = form.watch("category");

  const searchParams = coverSearch
    ? { title: coverSearch.title, category: coverSearch.category as typeof CATEGORIES[number] }
    : { title: "", category: "manhwa" as const };

  const { data: coverResults, isFetching: coverFetching } = useSearchCover(searchParams, {
    query: {
      enabled: !!coverSearch?.title,
      queryKey: getSearchCoverQueryKey(searchParams),
    },
  });

  const createMedia = useCreateMedia();

  React.useEffect(() => {
    if (!open) { form.reset(); setSelectedCover(null); setCoverSearch(null); }
  }, [open]);

  const onSubmit = (values: AddFormValues) => {
    const coverUrl = selectedCover || values.customCoverUrl || null;
    createMedia.mutate(
      { data: { title: values.title, category: values.category, listType: "bl", status: values.status ?? null, coverUrl, genres: [], notes: values.notes || null, currentChapter: values.currentChapter || null } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ listType: "bl" }) });
          toast({ title: "Added to vault", description: `${values.title} is now in your secret vault.` });
          onClose();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto border-rose-500/20">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-400 fill-rose-400" />
            Add to Secret Vault
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>Title</FormLabel>
                <FormControl><Input placeholder="Title..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value ?? ""}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger></FormControl>
                    <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s.replace(/_/g, " ")}</SelectItem>)}</SelectContent>
                  </Select>
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="currentChapter" render={({ field }) => (
              <FormItem>
                <FormLabel>Current Chapter/Episode</FormLabel>
                <FormControl><Input placeholder="e.g. Chapter 12" {...field} /></FormControl>
              </FormItem>
            )} />
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Cover</p>
                <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                  onClick={() => watchedTitle && setCoverSearch({ title: watchedTitle, category: watchedCategory })}
                  disabled={!watchedTitle || coverFetching}>
                  {coverFetching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
                  Search
                </Button>
              </div>
              {Array.isArray(coverResults) && coverResults.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {coverResults.map((r, i) => (
                    <button key={i} type="button" onClick={() => setSelectedCover(r.coverUrl)}
                      className={cn("relative w-14 h-20 rounded-lg overflow-hidden ring-2 transition-all",
                        selectedCover === r.coverUrl ? "ring-rose-400" : "ring-transparent hover:ring-border")}>
                      <img src={proxyImage(r.coverUrl) ?? r.coverUrl} alt={r.title} className="w-full h-full object-cover" />
                      {selectedCover === r.coverUrl && (
                        <div className="absolute inset-0 bg-rose-500/30 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <FormField control={form.control} name="customCoverUrl" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-muted-foreground">Or paste a cover URL</FormLabel>
                  <FormControl><Input placeholder="https://..." {...field} className="text-xs" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl><Textarea placeholder="..." rows={2} className="resize-none text-sm" {...field} /></FormControl>
              </FormItem>
            )} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" className="bg-rose-500 hover:bg-rose-600 text-white" disabled={createMedia.isPending}>
                {createMedia.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Add to Vault
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function BLVault() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);

  const { data: items, isLoading } = useListMedia({ listType: "bl" });
  const deleteMedia = useDeleteMedia();
  const updateMedia = useUpdateMedia();

  const itemsArray = Array.isArray(items) ? items : [];

  const handleDelete = (id: number, title: string) => {
    deleteMedia.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ listType: "bl" }) });
        toast({ title: "Removed from vault" });
      },
    });
  };

  const handleMoveToLibrary = (id: number, title: string) => {
    updateMedia.mutate({ id, data: { listType: "library", status: "plan_to_read" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ listType: "bl" }) });
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ listType: "library" }) });
        toast({ title: "Moved to Library", description: `${title} is now in your main library.` });
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative rounded-2xl overflow-hidden border border-rose-500/20 bg-gradient-to-br from-rose-500/10 via-pink-500/5 to-transparent p-6">
        <div className="absolute top-0 right-0 w-40 h-40 bg-rose-500/10 rounded-full -translate-y-10 translate-x-10 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-pink-500/10 rounded-full translate-y-6 -translate-x-6 blur-xl" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/25 flex items-center justify-center">
              <Heart className="w-6 h-6 text-rose-400 fill-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-display font-bold text-rose-400">Secret Vault</h1>
                <Lock className="w-4 h-4 text-rose-400/50" />
              </div>
              <p className="text-muted-foreground text-sm mt-0.5">
                {itemsArray.length > 0
                  ? `${itemsArray.length} title${itemsArray.length !== 1 ? "s" : ""} — just between us`
                  : "Your private collection, just between us ♡"}
              </p>
            </div>
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="bg-rose-500 hover:bg-rose-600 text-white gap-2 shadow-lg shadow-rose-500/20"
          >
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="aspect-[2/3] bg-muted animate-pulse rounded-xl" />
              <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : itemsArray.length === 0 ? (
        <Card className="border-dashed border-rose-500/20">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Heart className="w-12 h-12 text-rose-400/20 mb-4" />
            <h3 className="font-medium text-lg mb-1">Vault is empty</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Add your guilty pleasures here. No judgment, no one will know.
            </p>
            <Button className="mt-5 bg-rose-500 hover:bg-rose-600 text-white gap-2" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" />
              Add first title
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {itemsArray.map((item) => (
            <div key={item.id} className="group relative">
              <div className="aspect-[2/3] bg-muted rounded-xl overflow-hidden relative ring-1 ring-rose-500/20 group-hover:ring-rose-400/50 transition-all duration-300">
                {item.coverUrl || item.customCoverUrl ? (
                  <img
                    src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-rose-500/5">
                    <Heart className="w-8 h-8 text-rose-400/20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 gap-2">
                  {item.status && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 self-start">
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  )}
                  {item.currentChapter && (
                    <span className="text-[10px] text-white/60">{item.currentChapter}</span>
                  )}
                  <div className="flex gap-1.5">
                    <Button size="sm" variant="ghost"
                      className="h-7 px-2 text-[10px] gap-1 flex-1 bg-white/10 hover:bg-white/20 text-white border-0"
                      onClick={() => handleMoveToLibrary(item.id, item.title)}>
                      <BookOpen className="w-3 h-3" /> Library
                    </Button>
                    <Button size="sm" variant="ghost"
                      className="h-7 w-7 p-0 bg-red-500/20 hover:bg-red-500/40 text-red-300 border-0"
                      onClick={() => handleDelete(item.id, item.title)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
                {item.tier && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-md bg-black/60 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-xs font-display font-black text-rose-300">{item.tier}</span>
                  </div>
                )}
              </div>
              <div className="mt-2 space-y-0.5">
                <h3 className="font-medium text-sm leading-tight line-clamp-2">{item.title}</h3>
                <p className="text-xs text-rose-400/60 capitalize">{item.category}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <AddBLDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  );
}