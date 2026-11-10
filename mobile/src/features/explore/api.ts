import { apiRequest } from "@/src/services/api";

export const EXPLORE_SECTIONS = [
    "workouts",
    "programs",
    "exercises",
    "mobility",
    "learn"
] as const;

export type ExploreSection =
    (typeof EXPLORE_SECTIONS)[number];

export type ExploreDestination =
    ExploreSection | "tools";

export type ExploreCard = {
    id: string;
    slug: string;
    title: string;
    subtitle: string;
    imageUrl: string | null;
    meta: string;
    section: ExploreSection;
};

export type ExploreHome = {
    sections: Record<ExploreSection, ExploreCard[]>;
    unavailable: ExploreSection[];
};

export type ExplorePage = {
    items: ExploreCard[];
    total: number;
    page: number;
    pageSize: number;
};

export type ExploreFilters = {
    page?: number;
    pageSize?: number;
    q?: string;
    goal?: string;
    level?: string;
    equipment?: string;
};

export type GuidedStep = {
    title: string;
    seconds: number;
    instruction: string;
    image_url?: string | null;
    image_alt?: string;
    modification?: string;
    video_url?: string | null;
};

export type GuideSection = {
    heading: string;
    paragraphs: string[];
    image_url?: string | null;
    image_alt?: string;
    links?: { label: string; url: string }[];
};

export type ExploreResource = {
    id: string;
    slug: string;
    kind: "mobility" | "guide";
    title: string;
    summary: string;
    cover_url: string | null;
    duration_minutes: number;
    tags: string[];
    steps: GuidedStep[];
    body: GuideSection[];
};

function toQuery(filters: ExploreFilters) {
    const params = new URLSearchParams();

    for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== "") {
            params.set(key, String(value));
        }
    }

    const str = params.toString();

    return str ? `?${str}` : "";
}

export const exploreApi = {
    home: () =>
        apiRequest<ExploreHome>("/explore/home"),

    list: (
        section: ExploreSection,
        filters: ExploreFilters = {}
    ) =>
        apiRequest<ExplorePage>(
            `/explore/${section}${toQuery(filters)}`
        ),

    resource: (slug: string) =>
        apiRequest<ExploreResource>(
            `/explore/resources/${encodeURIComponent(slug)}`
        )
};