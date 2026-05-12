import React, { useState, useMemo } from "react";
import {
  useListMedia,
  useDeleteMedia,
  useUpdateMedia,
  getListMediaQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tv, Trash2, BookOpen, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn, proxyImage } from "@/lib/utils";

export default function ToWatch() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [activeGenre, setActiveGenre] = useState<string | null>(null);

  const { data: toWatchList, isLoading } = useListMedia({ listType: "to_read" });
  const deleteMedia = useDeleteMedia();
  const updateMedia = useUpdateMedia();

  const handleRemove = (id: number, title: string) => {
    deleteMedia.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ listType: "to_read" }) });
        toast({ title: "Removed", description: `${title} removed from your to-watch list.` });
      },
    });
  };

  const handleMoveToLibrary = (id: number, title: string) => {
    updateMedia.mutate({ id, data: { listType: "library", status: "plan_to_read" } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ listType: "to_read" }) });
        queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ listType: "library" }) });
        toast({ title: "Moved to Library", description: `${title} is now in your library.` });
      },
    });
  };

  // Only anime
  const animeArray = useMemo(() =>
    (Array.isArray(toWatchList) ? toWatchList : []).filter(
      (item) => item.category === "anime"
    ), [toWatchList]);

  const allGenres = useMemo(() => {
    const genres = new Set<string>();
    animeArray.forEach((item) => item.genres?.forEach((g) => genres.add(g)));
    return Array.from(genres).sort();
  }, [animeArray]);

  const filtered = useMemo(() => {
    if (!activeGenre) return animeArray;
    return animeArray.filter((i) => i.genres?.includes(activeGenre));
  }, [animeArray, activeGenre]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center">
          <Tv className="w-5 h-5 text-pink-400" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">To Watch</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Anime you want to watch</p>
        </div>
        {animeArray.length > 0 && (
          <Badge variant="secondary" className="ml-auto text-sm px-3 py-1">
            {animeArray.length} titles
          </Badge>
        )}
      </div>

      {/* Genre filter */}
      {allGenres.length > 0 && (
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-muted-foreground font-medium">Genre:</span>
          {allGenres.map((genre) => (
            <button key={genre} onClick={() => setActiveGenre(activeGenre === genre ? null : genre)}
              className={cn("px-2.5 py-1 rounded-full text-[11px] font-medium transition-all border",
                activeGenre === genre ? "bg-accent text-accent-foreground border-transparent" : "bg-card border-border text-muted-foreground hover:text-foreground"
              )}
            >{genre}</button>
          ))}
          {activeGenre && (
            <button onClick={() => setActiveGenre(null)} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />)}
        </div>
      ) : animeArray.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Tv className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-lg mb-1">Nothing here yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Add anime with the "To-Read" list type to see them here.
            </p>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-muted-foreground text-sm">No anime match that genre.</p>
          <button className="text-xs text-primary mt-2 hover:underline" onClick={() => setActiveGenre(null)}>Clear filter</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item) => (
            <div key={item.id} data-testid={`to-watch-card-${item.id}`}
              className="flex gap-3 p-3 rounded-xl bg-card border border-border hover:border-pink-400/30 transition-all group">
              <div className="w-14 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                {item.coverUrl || item.customCoverUrl ? (
                  <img src={proxyImage(item.customCoverUrl || item.coverUrl) ?? ""} alt={item.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground text-center px-1">No cover</div>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-1">{item.title}</h3>
                  {item.addedBy && (
                    <p className="text-xs text-muted-foreground">
                      Recommended by <span className="text-pink-400 font-medium">{item.addedBy}</span>
                    </p>
                  )}
                  {item.genres?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {item.genres.slice(0, 3).map((g) => (
                        <button key={g} onClick={() => setActiveGenre(g)}
                          className={cn("text-[9px] px-1.5 py-0.5 rounded transition-colors",
                            activeGenre === g ? "bg-pink-500/20 text-pink-400" : "bg-muted text-muted-foreground hover:bg-pink-500/10"
                          )}>
                          {g}
                        </button>
                      ))}
                    </div>
                  )}
                  {item.notes && <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 italic">"{item.notes}"</p>}
                </div>
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 hover:bg-pink-500/10 hover:text-pink-400"
                    onClick={() => handleMoveToLibrary(item.id, item.title)}>
                    <BookOpen className="w-3 h-3" /> Add to Library
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs gap-1 hover:bg-destructive/10 hover:text-destructive ml-auto"
                    onClick={() => handleRemove(item.id, item.title)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}