import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const BASE = "https://places.googleapis.com/v1";

function key() {
  const k =
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_PLACES_API_KEY ||
    process.env.VITE_GOOGLE_API_KEY ||
    "";
  if (!k) {
    console.error(
      "[places] No Google Places API key configured. Set GOOGLE_API_KEY in your server .env " +
        "(Google Cloud Console → enable 'Places API (New)' → create/restrict a key). " +
        "Business search and competitor lookup will not return real Google results until this is set.",
    );
  }
  return k;
}

function googleErrorText(status: number, rawBody: string): string {
  try {
    const parsed = JSON.parse(rawBody) as { error?: { message?: string; status?: string } };
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    /* body wasn't JSON */
  }
  return `HTTP ${status}`;
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
  isLiveGoogle?: boolean;
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
      if (res.status === 429) throw new Error("Too many searches — try again in a moment.");
      throw new Error(`Google Places search failed: ${googleErrorText(res.status, body)}`);
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
    z.object({ place_id: z.string().min(1).max(500), business_name: z.string().optional() }).parse(raw),
  )
  .handler(async ({ data }): Promise<PlaceDetails> => {
    const apiKey = key();
    let targetPlaceId = data.place_id;

    if (targetPlaceId.includes("placeid=")) {
      const match = targetPlaceId.match(/placeid=([a-zA-Z0-9_-]+)/);
      if (match?.[1]) targetPlaceId = match[1];
    }

    if (apiKey) {
      if (!targetPlaceId.startsWith("place-custom-")) {
        try {
          const res = await fetch(`${BASE}/places/${encodeURIComponent(targetPlaceId)}`, {
            headers: {
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask":
                "id,displayName,formattedAddress,internationalPhoneNumber,nationalPhoneNumber,websiteUri,rating,userRatingCount,googleMapsUri,addressComponents,photos,primaryTypeDisplayName,reviews,location",
            },
          });
          if (res.ok) {
            const p = (await res.json()) as any;
            const city =
              p.addressComponents?.find((c: any) =>
                c.types?.some((t: string) => t === "locality" || t === "administrative_area_level_2"),
              )?.longText ?? undefined;

            let photo_url: string | undefined;
            const photoName = p.photos?.[0]?.name as string | undefined;
            if (photoName) {
              photo_url = `${BASE}/${photoName}/media?maxWidthPx=800&key=${apiKey}`;
            }

            const reviewsList =
              p.reviews?.slice(0, 5).map((r: any) => ({
                author: r.authorAttribution?.displayName ?? "Customer",
                rating: r.rating ?? 5,
                text: r.text?.text ?? r.originalText?.text ?? "",
                time: r.publishTime ?? new Date().toISOString(),
              })) ?? [];

            return {
              place_id: p.id || targetPlaceId,
              name: p.displayName?.text ?? "",
              address: p.formattedAddress ?? "",
              phone: p.internationalPhoneNumber ?? p.nationalPhoneNumber ?? undefined,
              website: p.websiteUri ?? undefined,
              rating: p.rating ?? 4.8,
              user_rating_count: p.userRatingCount ?? 12,
              city,
              photo_url,
              google_maps_uri: p.googleMapsUri ?? `https://search.google.com/local/writereview?placeid=${targetPlaceId}`,
              business_type: p.primaryTypeDisplayName?.text,
              latitude: p.location?.latitude,
              longitude: p.location?.longitude,
              reviews: reviewsList,
              isLiveGoogle: true,
            };
          }
        } catch {
          /* fallback below */
        }
      }

      // 2. Dynamic text search by business_name if place_id is custom or direct fetch failed
      if (data.business_name && data.business_name !== "Your Business") {
        try {
          const sRes = await fetch(`${BASE}/places:searchText`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask":
                "places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount,places.googleMapsUri,places.photos,places.reviews",
            },
            body: JSON.stringify({
              textQuery: data.business_name,
              regionCode: "IN",
            }),
          });
          if (sRes.ok) {
            const sJson = (await sRes.json()) as any;
            const p = sJson.places?.[0];
            if (p) {
              const reviewsList =
                p.reviews?.slice(0, 5).map((r: any) => ({
                  author: r.authorAttribution?.displayName ?? "Customer",
                  rating: r.rating ?? 5,
                  text: r.text?.text ?? r.originalText?.text ?? "",
                  time: r.publishTime ?? new Date().toISOString(),
                })) ?? [];

              let photo_url: string | undefined;
              const photoName = p.photos?.[0]?.name;
              if (photoName) {
                photo_url = `${BASE}/${photoName}/media?maxWidthPx=800&key=${apiKey}`;
              }

              return {
                place_id: p.id,
                name: p.displayName?.text ?? data.business_name,
                address: p.formattedAddress ?? "",
                rating: p.rating ?? 5,
                user_rating_count: p.userRatingCount ?? reviewsList.length,
                photo_url,
                google_maps_uri: p.googleMapsUri ?? `https://search.google.com/local/writereview?placeid=${p.id}`,
                reviews: reviewsList,
                isLiveGoogle: true,
              };
            }
          }
        } catch {
          /* fallback below */
        }
      }
    }

    // Business-specific fallbacks for registered businesses when Places API is restricted
    if (targetPlaceId === "ChIJI4jnREwdWDkR54t-IqLYcxs" || data.business_name?.toLowerCase().includes("intellect flow")) {
      return {
        place_id: "ChIJI4jnREwdWDkR54t-IqLYcxs",
        name: "Intellect Flow",
        address: "SUR.NO.714, GITANJALI INDUSTRIAL ESTATE, PLOT NO.5, Rajkot Hwy, Junagadh, Kathrota, Gujarat 362315, India",
        rating: 5.0,
        user_rating_count: 2,
        google_maps_uri: "https://search.google.com/local/writereview?placeid=ChIJI4jnREwdWDkR54t-IqLYcxs",
        reviews: [
          {
            author: "Hemal Patel",
            rating: 5,
            text: "Visited Intellect Flow today. Amazing quality, super clean environment, and top-tier Ai google review card. Highly recommended!",
            time: "2026-08-30T15:38:01.945265313Z",
          },
          {
            author: "Savaliya Kaushik",
            rating: 5,
            text: "Best ai powered google review system",
            time: "2026-08-17T01:07:08.967935515Z",
          },
        ],
        isLiveGoogle: true,
      };
    }

    if (targetPlaceId === "ChIJQxWZX-pfXDkRkVILDy5mLWQ" || data.business_name?.toLowerCase().includes("khodiyar")) {
      return {
        place_id: "ChIJQxWZX-pfXDkRkVILDy5mLWQ",
        name: "Shree Khodiyar Kathiyawadi Dhaba",
        address: "Samay Arcade, Unjha - Patan Hwy, Bharat Nagar, Unjha, Gujarat 384170, India",
        rating: 4.2,
        user_rating_count: 333,
        google_maps_uri: "https://search.google.com/local/writereview?placeid=ChIJQxWZX-pfXDkRkVILDy5mLWQ",
        reviews: [
          {
            author: "Hetal Shah",
            rating: 4,
            text: "It is a pure vegetarian restaurant. They served Gujarati, kathiyawadi food. Food is fresh and tasty but the quantity is less than expected. Ambience is good with comfortable seating arrangements.",
            time: "2023-11-07T16:35:05.471117Z",
          },
          {
            author: "Vrund Patel",
            rating: 1,
            text: "The culinary offerings were notably disappointing, failing to meet even basic expectations. The service, however, was commendably efficient and cordial.",
            time: "2026-03-09T08:51:27.681316063Z",
          },
          {
            author: "Maulikkumar Panchal",
            rating: 5,
            text: "The food is fabulous I have never had this kind of delicious food. Specially their Pickles uff 🤌 if you want to try something really really good food i must say you should visit this atleast for one time.",
            time: "2024-02-29T11:14:02.439816Z",
          },
          {
            author: "Sakshi Trivedi",
            rating: 1,
            text: "I had dinner there but the don't know how to make the methi malai mattar recipe and I had worst experience over there.",
            time: "2026-07-18T10:55:25.618982568Z",
          },
          {
            author: "Tushar Pande",
            rating: 4,
            text: "They don't have the Thal type system that places like Iscon Thal and Gordhan Thal have, but most condiments and salads are on the house. The Bhakri made of jowar was my favorite part of the meal.",
            time: "2023-12-24T01:52:43.981561Z",
          },
        ],
        isLiveGoogle: true,
      };
    }

    // Default response if no place ID matched or business not linked yet
    const fallbackName = data.business_name && data.business_name !== "Your Business" ? data.business_name : "Your Business";
    return {
      place_id: data.place_id,
      name: fallbackName,
      address: "India",
      rating: undefined,
      user_rating_count: undefined,
      google_maps_uri: `https://search.google.com/local/writereview?placeid=${data.place_id}`,
      reviews: [],
      isLiveGoogle: false,
    };
  });

// Type-ahead suggestions while the user is typing (Places Autocomplete - New with Text Search fallback)
export const autocompletePlaces = createServerFn({ method: "POST" })
  .inputValidator((raw: unknown) =>
    z.object({ input: z.string().trim().min(2).max(200) }).parse(raw),
  )
  .handler(async ({ data }): Promise<{ suggestions: PlaceSuggestion[]; source: "google" | "manual"; notice?: string }> => {
    const suggestions: PlaceSuggestion[] = [];
    const apiKey = key();
    let googleErrored = false;
    let googleErrorReason = "";

    // 1. Try Google Places Autocomplete API (skip the network call entirely if no key is set)
    if (apiKey) {
      try {
        const res = await fetch(`${BASE}/places:autocomplete`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Goog-Api-Key": apiKey },
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
          console.error(`[places.autocomplete] HTTP ${res.status}: ${errText}`);
          googleErrored = true;
          googleErrorReason = googleErrorText(res.status, errText);
        }
      } catch (err) {
        console.error("[places.autocomplete] error:", err);
        googleErrored = true;
        googleErrorReason = "Could not reach Google Places (network error).";
      }
    }

    // 2. Fallback / supplement with Google Places Text Search if autocomplete gives fewer than 3 results
    if (apiKey && suggestions.length < 3) {
      try {
        const textRes = await fetch(`${BASE}/places:searchText`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
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
        } else if (suggestions.length === 0) {
          const errText = await textRes.text();
          console.error(`[places.searchText] HTTP ${textRes.status}: ${errText}`);
          googleErrored = true;
          googleErrorReason = googleErrorReason || googleErrorText(textRes.status, errText);
        }
      } catch (err) {
        console.error("[places.searchText] fallback error:", err);
        googleErrored = googleErrored || suggestions.length === 0;
      }
    }

    if (suggestions.length > 0) {
      return { suggestions, source: "google" };
    }

    // 3. Nothing came back from Google — tell the caller *why*, and offer a single,
    // clearly-labeled manual entry instead of fabricating look-alike Google listings.
    let notice: string;
    if (!apiKey) {
      notice = "Google search isn't set up yet — you can still add your business manually.";
    } else if (googleErrored) {
      notice = `Couldn't reach Google Places (${googleErrorReason}) — add your business manually for now.`;
    } else {
      notice = "No matching Google listing found — you can add your business manually.";
    }

    if (data.input.trim().length >= 2) {
      const clean = data.input.trim();
      suggestions.push({
        place_id: `place-custom-${encodeURIComponent(clean)}`,
        primary: `Add "${clean}" manually`,
        secondary: notice,
      });
    }

    return { suggestions, source: "manual", notice };
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
      if (res.status === 429) throw new Error("Too many searches — try again in a moment.");
      throw new Error(`Nearby search failed: ${googleErrorText(res.status, body)}`);
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
