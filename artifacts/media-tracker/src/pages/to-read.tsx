import React, { useState } from "react";
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
import { BookmarkPlus, Trash2, BookOpen, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const CATEGORY_COLORS: Record<string, string> = {
  webtoon: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  manhwa: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  manga: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  anime: "bg-pink-500/10 text-pink-400 border-pink-500/20",
};

export default function ToRead() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: toReadList, isLoading } = useListMedia({ listType: "to_read" });
  const deleteMedia = useDeleteMedia();
  const updateMedia = useUpdateMedia();

  const handleRemove = (id: number, title: string) => {
    deleteMedia.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ listType: "to_read" }) });
          toast({ title: "Removed", description: `${title} removed from your to-read list.` });
        },
      }
    );
  };

  const handleMoveToLibrary = (id: number, title: string) => {
    updateMedia.mutate(
      { id, data: { listType: "library", status: "plan_to_read" } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ listType: "to_read" }) });
          queryClient.invalidateQueries({ queryKey: getListMediaQueryKey({ listType: "library" }) });
          toast({ title: "Moved to Library", description: `${title} is now in your library.` });
        },
      }
    );
  };

  const grouped = (toReadList ?? []).reduce<Record<string, typeof toReadList>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category]!.push(item);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <BookmarkPlus className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-3xl font-display font-bold">To-Read</h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            Recommendations from friends you want to check out
          </p>
        </div>
        {(toReadList ?? []).length > 0 && (
          <Badge variant="secondary" className="ml-auto text-sm px-3 py-1">
            {toReadList!.length} titles
          </Badge>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (toReadList ?? []).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BookmarkPlus className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <h3 className="font-medium text-lg mb-1">Nothing here yet</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              When friends recommend something, add it here so you never forget.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped).map(([category, items]) => (
            <div key={category}>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <span className={cn("w-2 h-2 rounded-full inline-block", `bg-${category === "anime" ? "pink" : category === "manga" ? "orange" : category === "manhwa" ? "purple" : "blue"}-400`)} />
                {category}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(items ?? []).map((item) => (
                  <div
                    key={item.id}
                    data-testid={`to-read-card-${item.id}`}
                    className="flex gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all group"
                  >
                    <div className="w-14 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                      {item.coverUrl || item.customCoverUrl ? (
                        <img
                          src={item.customCoverUrl || item.coverUrl || ""}
                          alt={item.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[9px] text-muted-foreground text-center px-1">
                          No cover
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="font-medium text-sm leading-tight line-clamp-2 mb-1">{item.title}</h3>
                        {item.addedBy && (
                          <p className="text-xs text-muted-foreground">
                            Recommended by <span className="text-primary font-medium">{item.addedBy}</span>
                          </p>
                        )}
                        {item.genres.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {item.genres.slice(0, 2).map((g) => (
                              <span key={g} className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                {g}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-[10px] text-muted-foreground mt-1 line-clamp-1 italic">"{item.notes}"</p>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1 hover:bg-primary/10 hover:text-primary"
                          onClick={() => handleMoveToLibrary(item.id, item.title)}
                          data-testid={`move-to-library-${item.id}`}
                        >
                          <BookOpen className="w-3 h-3" />
                          Add to Library
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs gap-1 hover:bg-destructive/10 hover:text-destructive ml-auto"
                          onClick={() => handleRemove(item.id, item.title)}
                          data-testid={`remove-to-read-${item.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
