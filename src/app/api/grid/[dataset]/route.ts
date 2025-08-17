import { type NextRequest, NextResponse } from "next/server";
import type { MarketPrice } from "~/types";

const GRIDSTATUS_BASE_URL = "https://api.gridstatus.io/v1";

interface RawApiDataItem {
  interval_start_local?: string;
  interval_start_utc?: string;
  interval_end_local?: string;
  interval_end_utc?: string;
  location?: string;
  location_type?: string;
  market?: string;
  spp?: number;
}

interface RawApiResponse {
  status_code: number;
  data: RawApiDataItem[];
  meta: {
    page: number;
    limit: number | null;
    page_size: number;
    hasNextPage: boolean;
    cursor: string | null;
  };
}

/**
 * Transform GridStatus API response data into our internal MarketPrice format
 */
function transformGridStatusData(data: RawApiDataItem[]): MarketPrice[] {
  return data
    .filter(
      (item): item is Required<RawApiDataItem> =>
        !!item.interval_start_local &&
        !!item.interval_start_utc &&
        !!item.location &&
        typeof item.spp === "number",
    )
    .map((item) => ({
      datetime_beginning_ept: item.interval_start_local,
      datetime_beginning_utc: item.interval_start_utc,
      settlement_point: item.location,
      settlement_point_price: item.spp,
    }));
}

function buildGridStatusQuery(original: URLSearchParams): string {
  // Pass through parameters exactly as provided (e.g., start_time, end_time, timezone)
  const query = original.toString();
  return query ? `?${query}` : "";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ dataset: string }> },
) {
  try {
    const { dataset } = await params;
    // Map friendly aliases to canonical GridStatus dataset slugs
    const CANONICAL_DATASET_MAP: Record<string, string> = {
      ercot_day_ahead_hourly: "ercot_spp_day_ahead_hourly",
      ercot_spp_real_time_5_minute: "ercot_lmp_by_settlement_point",
    };
    const datasetSlug = CANONICAL_DATASET_MAP[dataset] ?? dataset;
    const searchParams = request.nextUrl.searchParams;

    const queryString = buildGridStatusQuery(searchParams);

    // Always use the datasets query endpoint: /v1/datasets/{dataset}/query
    const url = `${GRIDSTATUS_BASE_URL}/datasets/${datasetSlug}/query${queryString}`;

    const headers = {
      "x-api-key": process.env.GRIDSTATUS_API_KEY!,
      Accept: "application/json",
      "Content-Type": "application/json",
    } as const;

    // Retry helper for 429 responses with incremental backoff
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    const getBackoffMs = (response: Response, attempt: number): number => {
      const retryAfter = response.headers.get("retry-after");
      if (retryAfter) {
        const seconds = Number(retryAfter);
        if (!Number.isNaN(seconds))
          return Math.max(0, Math.ceil(seconds * 1000));
        const dateMs = Date.parse(retryAfter);
        if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - Date.now());
      }
      // Default incremental backoff (~1.2s per attempt to respect 1 rps limit)
      const baseMs = 1200;
      return baseMs * (attempt + 1);
    };

    let attemptsUsed = 0;
    const fetchWithRetry = async (maxRetries = 3): Promise<Response> => {
      let lastError: Error | null = null;
      console.info("GridStatus proxy request", {
        datasetRequested: dataset,
        datasetResolved: datasetSlug,
        url,
        query: searchParams.toString(),
      });
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        attemptsUsed++;
        try {
          const res = await fetch(url, {
            headers,
            signal: AbortSignal.timeout(15000),
            cache: "no-store",
          });
          if (res.status === 429 && attempt < maxRetries) {
            const delayMs = getBackoffMs(res, attempt);
            console.warn("GridStatus 429 received; backing off", {
              attempt,
              delayMs,
              url,
            });
            await sleep(delayMs);
            continue;
          }
          return res;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          // Network errors shouldn't be retried more than maxRetries
          if (attempt < maxRetries) {
            const delayMs = 1200 * (attempt + 1);
            console.warn("GridStatus fetch error; retrying", {
              attempt,
              delayMs,
              url,
              error: lastError.message,
            });
            await sleep(delayMs);
            continue;
          }
          throw lastError;
        }
      }
      throw lastError ?? new Error("Unknown error during fetchWithRetry");
    };

    const response = await fetchWithRetry(3);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("GridStatus proxy non-OK response", {
        status: response.status,
        statusText: response.statusText,
        url,
      });
      return NextResponse.json(
        {
          error: `GridStatus error: ${response.status} ${response.statusText}`,
          details: errorText,
        },
        { status: response.status },
      );
    }

    const apiResponse = (await response.json()) as RawApiResponse;
    console.info("GridStatus proxy success", {
      status: response.status,
      attemptsUsed,
      url,
      dataLength: apiResponse.data?.length ?? 0,
      statusCode: apiResponse.status_code,
      meta: apiResponse.meta,
      sampleData: apiResponse.data?.slice(0, 2),
    });

    // Transform the data to match our internal format
    const transformedData =
      apiResponse.data && Array.isArray(apiResponse.data)
        ? transformGridStatusData(apiResponse.data)
        : [];

    // Return response in our expected format
    const formattedResponse = {
      data: transformedData,
      total: transformedData.length,
      page: apiResponse.meta?.page ?? 1,
      page_size: apiResponse.meta?.page_size ?? transformedData.length,
    };

    return NextResponse.json(formattedResponse, {
      headers: {
        "Cache-Control": "public, s-maxage=300",
        "X-Data-Source": "gridstatus",
        "X-GridStatus-URL": url,
        "X-GridStatus-Dataset": datasetSlug,
        "X-Retry-Attempts": String(attemptsUsed),
      },
    });
  } catch (error: unknown) {
    console.error("Error proxying to GridStatus:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
