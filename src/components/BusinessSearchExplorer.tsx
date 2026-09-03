import { useState, useEffect, useRef } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPlaceDetails, type PlaceDetails, type PlaceSuggestion } from "@/lib/places.functions";
import { PlaceSearchInput } from "@/components/PlaceSearchInput";
import {
  MapPin,
  Phone,
  Globe,
  Star,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Building2,
  MessageSquare,
  Sparkles,
  Info,
  Layers,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { toast } from "sonner";

export function BusinessSearchExplorer({
  onImport,
  autoFetchPlaceId,
  autoFetchName,
}: {
  onImport?: (details: PlaceDetails) => void;
  autoFetchPlaceId?: string;
  autoFetchName?: string;
}) {
  const fetchDetails = useServerFn(getPlaceDetails);
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<PlaceDetails | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  const [imported, setImported] = useState(false);
  const autoFetchedRef = useRef(false);

  useEffect(() => {
    if ((autoFetchPlaceId || autoFetchName) && !details && !loading && !autoFetchedRef.current) {
      autoFetchedRef.current = true;
      loadDetails({
        place_id: autoFetchPlaceId || `place-custom-${encodeURIComponent(autoFetchName || "business")}`,
        primary: autoFetchName || "My Business",
        secondary: "",
      });
    }
  }, [autoFetchPlaceId, autoFetchName]);

  const loadDetails = async (suggestion: PlaceSuggestion) => {
    setLoading(true);
    setImported(false);
    try {
      const res = await fetchDetails({
        data: {
          place_id: suggestion.place_id,
          business_name: suggestion.primary,
        },
      });
      setDetails(res);
      setActivePhotoIdx(0);
      toast.success(`Successfully fetched details for ${res.name}!`);
    } catch (e) {
      console.error(e);
      toast.error("Could not fetch complete place details. Please try another query.");
    } finally {
      setLoading(false);
    }
  };

  const handleImport = () => {
    if (!details) return;
    if (onImport) {
      onImport(details);
      setImported(true);
      toast.success(`Imported ${details.name} into profile!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-white border border-black/10 rounded-2xl p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="font-black text-lg text-zinc-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" /> Business Search & Auto-Fetch Engine
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Type any shop or company name to instantly auto-fetch Logo, Address, Photos, Description, Reviews, Ratings, Phone, Website, Services & Maps Listings.
            </p>
          </div>
        </div>

        <PlaceSearchInput
          placeholder="Search business on Google Maps (e.g. Intellect Flow Junagadh, Khodiyar Dhaba)..."
          onSelect={loadDetails}
          disabled={loading}
        />
      </div>

      {loading && (
        <div className="bg-white border border-black/10 rounded-2xl p-12 text-center space-y-3 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-amber-600" />
          <p className="text-sm font-bold text-zinc-800">Auto-fetching 10 business attributes from Google Maps…</p>
          <p className="text-xs text-zinc-500">Retrieving logo, photo gallery, editorial summary, live reviews & services list.</p>
        </div>
      )}

      {!loading && details && (
        <div className="bg-white border border-black/10 rounded-2xl overflow-hidden shadow-sm space-y-0">
          {/* Top Banner & Logo */}
          <div className="relative bg-zinc-900 text-white p-6 overflow-hidden">
            {details.photos && details.photos.length > 0 && (
              <div
                className="absolute inset-0 opacity-20 blur-sm bg-cover bg-center"
                style={{ backgroundImage: `url(${details.photos[activePhotoIdx] || details.photo_url})` }}
              />
            )}
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {/* 1. Logo / Profile Photo */}
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-black font-black text-2xl grid place-items-center shrink-0 border-2 border-white/20 shadow-md overflow-hidden">
                  {details.logo_url || details.photo_url ? (
                    <img
                      src={details.logo_url || details.photo_url}
                      alt={details.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                  ) : (
                    details.name.slice(0, 2).toUpperCase()
                  )}
                </div>

                <div>
                  <div className="inline-flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-400/20 border border-amber-400/30 text-amber-300 text-[10px] font-bold uppercase tracking-wider">
                      {details.business_type || "Google Business"}
                    </span>
                    {details.isLiveGoogle && (
                      <span className="px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Live Google Verified
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-black text-white mt-1">{details.name}</h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-300 mt-1 flex-wrap">
                    {/* 6. Rating & Reviews Count */}
                    <div className="flex items-center gap-1 font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{details.rating?.toFixed(1) ?? "5.0"}</span>
                    </div>
                    <span>({details.user_rating_count ?? 0} Google Reviews)</span>
                    {details.city && <span>· {details.city}</span>}
                  </div>
                </div>
              </div>

              {onImport && (
                <button
                  onClick={handleImport}
                  disabled={imported}
                  className={
                    "px-4 py-2.5 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 transition shadow-sm shrink-0 " +
                    (imported
                      ? "bg-emerald-600 text-white"
                      : "bg-white text-zinc-900 hover:bg-zinc-100")
                  }
                >
                  {imported ? (
                    <>
                      <Check className="w-4 h-4" /> Profile Imported
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-600" /> Import & Connect Profile
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Grid of Fetched Metadata (10 Attributes Breakdown) */}
          <div className="p-6 space-y-6">
            {/* 2. Address & 7. Contact Details & 8. Website */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3.5 rounded-xl border border-black/10 bg-zinc-50/50 space-y-1">
                <div className="text-[11px] font-bold uppercase text-zinc-400 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-red-500" /> Address & Location
                </div>
                <div className="text-xs font-medium text-zinc-800 leading-snug">{details.address || "Address not specified"}</div>
              </div>

              <div className="p-3.5 rounded-xl border border-black/10 bg-zinc-50/50 space-y-1">
                <div className="text-[11px] font-bold uppercase text-zinc-400 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" /> Contact Phone
                </div>
                <div className="text-xs font-semibold text-zinc-900">
                  {details.phone ? (
                    <a href={`tel:${details.phone}`} className="hover:underline text-emerald-700">
                      {details.phone}
                    </a>
                  ) : (
                    "Phone available on Google Maps"
                  )}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-black/10 bg-zinc-50/50 space-y-1">
                <div className="text-[11px] font-bold uppercase text-zinc-400 flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-blue-600" /> Website Link
                </div>
                <div className="text-xs font-semibold text-zinc-900 truncate">
                  {details.website ? (
                    <a href={details.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                      {details.website.replace(/^https?:\/\//, "").slice(0, 24)}… <ExternalLink className="w-3 h-3" />
                    </a>
                  ) : (
                    "No external website"
                  )}
                </div>
              </div>
            </div>

            {/* 4. Description */}
            {details.description && (
              <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 space-y-1.5">
                <div className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <Info className="w-4 h-4 text-amber-600" /> About Business / Editorial Summary
                </div>
                <p className="text-xs text-zinc-700 leading-relaxed">{details.description}</p>
              </div>
            )}

            {/* 3. Photos Gallery */}
            {details.photos && details.photos.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-zinc-700" /> Photo Gallery ({details.photos.length} Google Photos Fetched)
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {details.photos.map((url, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhotoIdx(idx)}
                      className={
                        "h-20 rounded-xl overflow-hidden border-2 transition relative bg-zinc-100 " +
                        (activePhotoIdx === idx ? "border-amber-500 ring-2 ring-amber-500/20" : "border-black/10 opacity-70 hover:opacity-100")
                      }
                    >
                      <img src={url} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 9. Services & Categories */}
            {details.services && details.services.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-zinc-700" /> Auto-Detected Services & Categories
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {details.services.map((svc, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-full bg-zinc-100 border border-black/10 text-xs font-semibold text-zinc-700">
                      ✨ {svc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Reviews Sample List */}
            {details.reviews && details.reviews.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-black/5">
                <div className="text-xs font-bold uppercase text-zinc-500 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-zinc-700" /> Live Google Reviews Sample ({details.reviews.length} Fetched)
                </div>
                <div className="space-y-2.5">
                  {details.reviews.map((rev, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-black/10 bg-zinc-50/50 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-zinc-200 text-zinc-700 font-bold text-xs grid place-items-center overflow-hidden">
                            {rev.profile_photo_url ? (
                              <img src={rev.profile_photo_url} alt={rev.author} className="w-full h-full object-cover" />
                            ) : (
                              rev.author.slice(0, 1)
                            )}
                          </div>
                          <span className="text-xs font-bold text-zinc-900">{rev.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              className={
                                "w-3 h-3 " +
                                (s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-zinc-200")
                              }
                            />
                          ))}
                          {rev.sentiment && (
                            <span
                              className={
                                "ml-1 px-1.5 py-0.2 rounded text-[10px] font-bold capitalize " +
                                (rev.sentiment === "positive"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : rev.sentiment === "negative"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-zinc-200 text-zinc-700")
                              }
                            >
                              {rev.sentiment}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-zinc-700 italic leading-snug">"{rev.text}"</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 10. Listings & Google CID Link */}
            <div className="pt-3 border-t border-black/5 flex items-center justify-between gap-2 flex-wrap text-xs text-zinc-500">
              <div>
                <span className="font-bold text-zinc-700">Place ID:</span> {details.place_id}
              </div>
              {details.google_maps_uri && (
                <a
                  href={details.google_maps_uri}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  Open Google Maps Write Review Link <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
