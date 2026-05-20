import React, { useState } from "react";
import { useListMedia } from "@workspace/api-client-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Star, MessageSquare, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditMediaDialog } from "../components/edit-media-dialog";

export default function ReviewsPage() {
  const [editingMedia, setEditingMedia] = useState<any>(null);
  const { data: media } = useListMedia({ listType: "library" });
  
  const categories = ["manhwa", "webtoon", "manhua", "manga", "anime"];
  const allMedia = media || [];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-display font-bold">Reviews Dashboard</h1>
      
      <Tabs defaultValue="manhwa">
        <TabsList className="w-full justify-start overflow-x-auto">
          {categories.map(cat => (
            <TabsTrigger key={cat} value={cat} className="capitalize">{cat}</TabsTrigger>
          ))}
        </TabsList>

        {categories.map(cat => (
          <TabsContent key={cat} value={cat} className="space-y-6">
            {/* Section 1: Needs Review */}
            <section>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Needs Review</h3>
              <div className="grid gap-2">
                {allMedia.filter(m => m.category === cat && (!m.reviewText && !m.rating)).map(m => (
                  <div key={m.id} className="flex justify-between items-center p-2 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium">{m.title}</span>
                    <Button size="sm" variant="outline" onClick={() => setEditingMedia(m)}>
                      <Plus className="w-4 h-4 mr-1" /> Add Review
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            {/* Section 2: Already Reviewed */}
            <section>
              <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Completed Reviews</h3>
              <div className="grid gap-4">
                {allMedia.filter(m => m.category === cat && (m.reviewText || m.rating)).map(m => (
                  <Card key={m.id}>
                    <CardContent className="p-4 flex gap-4 items-center">
                      <div className="w-12 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                        {m.coverUrl && <img src={m.coverUrl} className="w-full h-full object-cover" />}
                      </div>
                      <div className="flex-1">
                        <h2 className="font-bold">{m.title}</h2>
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {(m as any).rating}/10</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {(m as any).reviewText?.slice(0, 30)}...</span>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setEditingMedia(m)}><Pencil className="w-4 h-4" /></Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </TabsContent>
        ))}
      </Tabs>

      <EditMediaDialog open={!!editingMedia} onClose={() => setEditingMedia(null)} media={editingMedia} />
    </div>
  );
}