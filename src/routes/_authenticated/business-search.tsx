import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyBusiness } from "@/lib/queries";
import { BusinessSearchExplorer } from "@/components/BusinessSearchExplorer";
import { toast } from "sonner";
import { Sparkles, Building2, Search } from "lucide-react";

export const Route = createFileRoute("/_authenticated/business-search")({
  head: () => ({
    meta: [
      { title: "Business Search & Auto-Fetch — IntellectFlow" },
      { name: "description", content: "Search any business to auto-fetch Logo, Address, Photos, Description, Reviews, Ratings, Phone, Website, Services & Listings." },
      { property: "og:title", content: "Business Search & Auto-Fetch — IntellectFlow" },
      { property: "og:description", content: "Search any business to auto-fetch Logo, Address, Photos, Description, Reviews, Ratings, Phone, Website, Services & Listings." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BusinessSearchPage,
});

function BusinessSearchPage() {
  const { data: biz } = useQuery({ queryKey: ["biz"], queryFn: getMyBusiness });
  const qc = useQueryClient();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap border-b border-black/10 pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-900 text-xs font-bold mb-2">
            <Search className="w-3.5 h-3.5 text-amber-600" /> 10-Attribute Auto-Fetch Engine
          </div>
          <h1 className="font-black text-2xl text-zinc-900">Business Search</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Search any local shop or company on Google Maps to auto-fetch all 10 business metadata attributes (**Logo, Address, Photos, Description, Reviews, Ratings, Contact Details, Website, Services & Listings**).
          </p>
        </div>
      </div>

      <BusinessSearchExplorer
        onImport={async (importedDetails) => {
          if (!biz?.id) {
            toast.error("No active business connected to import into.");
            return;
          }
          try {
            const gmbLink =
              importedDetails.google_maps_uri ||
              `https://search.google.com/local/writereview?placeid=${importedDetails.place_id}`;

            const { error } = await supabase
              .from("businesses")
              .update({
                place_id: importedDetails.place_id,
                gmb_link: gmbLink,
                name: importedDetails.name,
                address: importedDetails.address,
                phone: importedDetails.phone ?? biz.phone,
                website: importedDetails.website ?? biz.website,
                description: importedDetails.description ?? biz.description,
                photo_url: importedDetails.photo_url || importedDetails.logo_url || biz.photo_url,
                business_type: importedDetails.business_type ?? biz.business_type,
                rating: importedDetails.rating ?? biz.rating,
                total_reviews: importedDetails.user_rating_count ?? biz.total_reviews,
              } as any)
              .eq("id", biz.id);

            if (error) throw error;
            toast.success(`Successfully imported all 10 attributes for ${importedDetails.name}!`);
            await qc.invalidateQueries({ queryKey: ["biz"] });
            await qc.invalidateQueries({ queryKey: ["google-reviews"] });
          } catch (err) {
            console.error(err);
            toast.error("Failed to update business profile.");
          }
        }}
      />
    </div>
  );
}
