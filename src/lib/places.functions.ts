import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BASE = "https://places.googleapis.com/v1";

function key() {
  const k = process.env.GOOGLE_API_KEY || process.env.GOOGLE_ANALYTICS_API_KEY;
  if (!k) throw new Error("Missing GOOGLE_API_KEY");
  return k;
}

export type PlaceSuggestion = {
  place_id: string;
  primary: string;
  secondary: string;
};

export type PlaceSummary = {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  user_rating_count?: number;
};

export type PlaceDetails = {
  place_id: string;
  name: string;
  address: string;
  phone?: string;
  website?: string;
  rating?: number;
  user_rating_count?: number;
  city?: string;
  photo_url?: string;
  google_maps_uri?: string;
  business_type?: string;
  latitude?: number;
  longitude?: number;
  reviews?: { author: string; rating: number; text: string; time: string }[];
};

export type NearbyCompetitor = {
  place_id: string;
  name: string;
  address: string;
  rating?: number;
  user_rating_count?: number;
  distance_meters: number;
};

export const searchPlaces = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ query: z.string().trim().min(2, "Enter at least 2 characters").max(200) }).parse(raw),
  )
  .handler(async ({ data }): Promise<{ results: PlaceSummary[] }> => {
    let res: Response;
    try {
      res = await fetch(`${BASE}/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key(),
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount",
        },
        body: JSON.stringify({ textQuery: data.query, regionCode: "IN" }),
      });
    } catch {
      throw new Error("Could not reach Google Places. Check your internet and try again.");
    }
    if (!res.ok) {
      const body = await res.text();
      console.error(`[places.search] ${res.status}: ${body}`);
      if (res.status === 403) throw new Error("Google Places API key is not authorized. Enable 'Places API (New)' on the key.");
      if (res.status === 429) throw new Error("Too many searches — try again in a moment.");
      throw new Error(`Google Places search failed (${res.status}). Try a different search.`);
    }
    const json = (await res.json()) as {
      places?: Array<{
        id: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        rating?: number;
        userRatingCount?: number;
      }>;
    };
    return {
      results:
        json.places?.map((p) => ({
          place_id: p.id,
          name: p.displayName?.text ?? "",
          address: p.formattedAddress ?? "",
          rating: p.rating,
          user_rating_count: p.userRatingCount,
        })) ?? [],
    };
  });


export const getPlaceDetails = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ place_id: z.string().min(1).max(200) }).parse(raw),
  )
  .handler(async ({ data }): Promise<PlaceDetails> => {
    let res: Response;
    try {
      res = await fetch(`${BASE}/places/${encodeURIComponent(data.place_id)}`, {
        headers: {
          "X-Goog-Api-Key": key(),
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,internationalPhoneNumber,nationalPhoneNumber,websiteUri,rating,userRatingCount,googleMapsUri,addressComponents,photos,primaryTypeDisplayName,reviews,location",
        },
      });
    } catch {
      throw new Error("Could not reach Google Places. Check your internet and try again.");
    }
    if (!res.ok) {
      const body = await res.text();
      console.error(`[places.details] ${res.status}: ${body}`);
      if (res.status === 403) throw new Error("Google Places API key is not authorized. Enable 'Places API (New)' on the key.");
      if (res.status === 404) throw new Error("This business is no longer available on Google.");
      throw new Error(`Failed to load business details (${res.status}).`);
    }
    const p = (await res.json()) as any;

    const city =
      p.addressComponents?.find((c: any) =>
        c.types?.some((t: string) => t === "locality" || t === "administrative_area_level_2"),
      )?.longText ?? undefined;

    let photo_url: string | undefined;
    const photoName = p.photos?.[0]?.name as string | undefined;
    if (photoName) {
      photo_url = `${BASE}/${photoName}/media?maxWidthPx=800&key=${key()}`;
    }

    return {
      place_id: p.id,
      name: p.displayName?.text ?? "",
      address: p.formattedAddress ?? "",
      phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? undefined,
      website: p.websiteUri ?? undefined,
      rating: p.rating,
      user_rating_count: p.userRatingCount,
      city,
      photo_url,
      google_maps_uri: p.googleMapsUri,
      business_type: p.primaryTypeDisplayName?.text,
      latitude: p.location?.latitude,
      longitude: p.location?.longitude,
      reviews: p.reviews?.slice(0, 5).map((r: any) => ({
        author: r.authorAttribution?.displayName ?? "Customer",
        rating: r.rating ?? 0,
        text: r.text?.text ?? r.originalText?.text ?? "",
        time: r.publishTime ?? "",
      })),
    };
  });

// Type-ahead suggestions while the user is typing (Places Autocomplete - New with Text Search fallback)
export const autocompletePlaces = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ input: z.string().trim().min(2).max(200) }).parse(raw),
  )
  .handler(async ({ data }): Promise<{ suggestions: PlaceSuggestion[] }> => {
    const suggestions: PlaceSuggestion[] = [];

    // 1. Try Google Places Autocomplete API
    try {
      const res = await fetch(`${BASE}/places:autocomplete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Goog-Api-Key": key() },
        body: JSON.stringify({
          input: data.input,
          regionCode: "IN",
        }),
      });
      if (res.ok) {
        const json = (await res.json()) as {
          suggestions?: Array<{
            placePrediction?: {
              placeId?: string;
              structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
              text?: { text?: string };
            };
          }>;
        };
        const items =
          json.suggestions
            ?.map((s) => s.placePrediction)
            .filter((p): p is NonNullable<typeof p> => !!p?.placeId)
            .map((p) => ({
              place_id: p.placeId!,
              primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
              secondary: p.structuredFormat?.secondaryText?.text ?? "",
            })) ?? [];
        suggestions.push(...items);
      } else {
        const errText = await res.text();
        console.warn(`[places.autocomplete] HTTP ${res.status}: ${errText}`);
      }
    } catch (err) {
      console.warn("[places.autocomplete] error:", err);
    }

    // 2. Fallback / supplement with Google Places Text Search if autocomplete gives fewer than 3 results
    if (suggestions.length < 3) {
      try {
        const textRes = await fetch(`${BASE}/places:searchText`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": key(),
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress",
          },
          body: JSON.stringify({ textQuery: data.input, regionCode: "IN" }),
        });
        if (textRes.ok) {
          const textJson = (await textRes.json()) as {
            places?: Array<{
              id: string;
              displayName?: { text?: string };
              formattedAddress?: string;
            }>;
          };
          const existingIds = new Set(suggestions.map((s) => s.place_id));
          for (const p of textJson.places ?? []) {
            if (p.id && !existingIds.has(p.id)) {
              suggestions.push({
                place_id: p.id,
                primary: p.displayName?.text ?? "",
                secondary: p.formattedAddress ?? "",
              });
              existingIds.add(p.id);
            }
          }
        }
      } catch (err) {
        console.warn("[places.searchText] fallback error:", err);
      }
    }

    return { suggestions };
  });

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Auto-fetch nearby competitors — searches Google Places for businesses of the
// same category within `radius_meters` of the business's own coordinates,
// excludes the business itself, and returns the closest `limit` results.
export const searchNearbyCompetitors = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({
      latitude: z.number(),
      longitude: z.number(),
      business_type: z.string().default("business"),
      self_place_id: z.string().optional(),
      self_name: z.string().optional(),
      radius_meters: z.number().min(100).max(50000).default(2000),
      limit: z.number().min(1).max(20).default(5),
    }).parse(raw),
  )
  .handler(async ({ data }): Promise<{ results: NearbyCompetitor[] }> => {
    let res: Response;
    try {
      res = await fetch(`${BASE}/places:searchText`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key(),
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.location",
        },
        body: JSON.stringify({
          textQuery: data.business_type,
          regionCode: "IN",
          maxResultCount: 20,
          locationBias: {
            circle: {
              center: { latitude: data.latitude, longitude: data.longitude },
              radius: data.radius_meters,
            },
          },
        }),
      });
    } catch {
      throw new Error("Could not reach Google Places. Check your internet and try again.");
    }
    if (!res.ok) {
      const body = await res.text();
      console.error(`[places.searchNearby] ${res.status}: ${body}`);
      if (res.status === 403) throw new Error("Google Places API key is not authorized. Enable 'Places API (New)' on the key.");
      if (res.status === 429) throw new Error("Too many searches — try again in a moment.");
      throw new Error(`Nearby search failed (${res.status}).`);
    }
    const json = (await res.json()) as {
      places?: Array<{
        id: string;
        displayName?: { text?: string };
        formattedAddress?: string;
        rating?: number;
        userRatingCount?: number;
        location?: { latitude?: number; longitude?: number };
      }>;
    };

    const results = (json.places ?? [])
      .filter((p) => p.id !== data.self_place_id)
      .filter((p) => !(data.self_name && p.displayName?.text?.trim().toLowerCase() === data.self_name.trim().toLowerCase()))
      .map((p): NearbyCompetitor | null => {
        if (p.location?.latitude == null || p.location?.longitude == null) return null;
        const distance_meters = Math.round(
          haversineMeters(data.latitude, data.longitude, p.location.latitude, p.location.longitude),
        );
        return {
          place_id: p.id,
          name: p.displayName?.text ?? "",
          address: p.formattedAddress ?? "",
          rating: p.rating,
          user_rating_count: p.userRatingCount,
          distance_meters,
        };
      })
      .filter((p): p is NearbyCompetitor => !!p && p.distance_meters <= data.radius_meters)
      .sort((a, b) => a.distance_meters - b.distance_meters)
      .slice(0, data.limit);

    return { results };
  });
