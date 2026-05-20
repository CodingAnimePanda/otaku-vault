// artifacts/media-tracker/src/pages/reviews.tsx
import React from "react";
import { useListMedia } from "@workspace/api-client-react";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MessageSquare } from "lucide-react";

export default function ReviewsPage() {
  const { data: media } = useListMedia({ listType: "library" });
  const reviewed = (media || []).filter(m => (m as any).reviewText || (m as any).rating > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold">My Reviews</h1>
      <div className="grid gap-4">
        {reviewed.length === 0 ? (
          <p className="text-muted-foreground">No reviews yet. Go edit a title to add your first review!</p>
        ) : reviewed.map(item => (
          <Card key={item.id}>
            <CardContent className="p-4 flex gap-4 items-start">
              <div className="w-16 h-24 bg-muted rounded overflow-hidden flex-shrink-0">
                {item.coverUrl && <img src={item.coverUrl} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-lg">{item.title}</h2>
                <div className="flex items-center gap-4 text-sm mt-1">
                  <div className="flex items-center gap-1 text-yellow-500">
                    <Star className="w-4 h-4 fill-current" />
                    <span className="font-bold">{(item as any).rating ?? 0}/10</span>
                  </div>
                </div>
                <div className="mt-3 flex gap-2">
                  <MessageSquare className="w-4 h-4 text-primary mt-0.5" />
                  <p className="text-sm text-muted-foreground italic">"{(item as any).reviewText || "No written review yet."}"</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}