import { db } from "../../config/supabase.js";
import { checkDbError } from "../../common/errors.js";

export type ExploreSection =
    | "workouts"
    | "programs"
    | "exercises"
    | "mobility"
    | "learn";

export type ExploreFilters = {
    page: number;
    pageSize: number;
    q: string;
    level?: string;
    goal?: string;
    equipment?: string;
};

type ExploreCard = {
    id: string;
    slug: string;
    title: string;
    subtitle: string;
    imageUrl: string | null;
    meta: string;
    section: ExploreSection;
};

function exerciseImage(media: unknown): string | null {
    if (!Array.isArray(media)) return null;

    const image = media.find(
        item => item?.kind === "image"
    );

    if (!image) return null;

    if (image.provider === "cloudinary") {
        return image.url ?? null;
    }

    if (image.provider === "supabase" && image.path) {
        return db.storage
            .from("exercise-images")
            .getPublicUrl(image.path).data.publicUrl;
    }

    return null;
}

function searchText(value: string) {
    return `%${value.replace(/[\\%_]/g, "\\$&")}%`;
}

export async function listSection(
    section: ExploreSection,
    filters: ExploreFilters
) {
    const {
        page,
        pageSize,
        q,
        level,
        goal,
        equipment
    } = filters;

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    if (section === "programs") {
        let query = db
            .from("training_programs")
            .select(
                "id,slug,name,tagline,cover_url,level,goal,equipment,duration_weeks,days_per_week,featured_rank",
                { count: "exact" }
            )
            .eq("published", true);

        if (q) {
            query = query.ilike("name", searchText(q));
        }

        if (level) {
            query = query.eq("level", level);
        }

        if (goal) {
            query = query.eq("goal", goal);
        }

        if (equipment) {
            query = query.eq("equipment", equipment);
        }

        const { data, error, count } = await query
            .order("featured_rank", {
                ascending: true,
                nullsFirst: false
            })
            .order("name")
            .order("id")
            .range(from, to);

        checkDbError(error, "explore programs");

        return {
            items: (data ?? []).map(row => ({
                id: row.id,
                slug: row.slug,
                title: row.name,
                subtitle: row.tagline,
                imageUrl: row.cover_url,
                meta:
                    `${row.duration_weeks} weeks · ` +
                    `${row.days_per_week} days/week`,
                section
            })),
            total: count ?? 0,
            page,
            pageSize
        };
    }

    if (section === "workouts") {
        let query = db
            .from("training_routines")
            .select(
                "id,slug,name,description,image_url,level,goal,equipment,estimated_minutes,featured_rank",
                { count: "exact" }
            )
            .eq("published", true);

        if (q) {
            query = query.ilike("name", searchText(q));
        }

        if (level) {
            query = query.eq("level", level);
        }

        if (goal) {
            query = query.eq("goal", goal);
        }

        if (equipment) {
            query = query.eq("equipment", equipment);
        }

        const { data, error, count } = await query
            .order("featured_rank", {
                ascending: true,
                nullsFirst: false
            })
            .order("name")
            .order("id")
            .range(from, to);

        checkDbError(error, "explore workouts");

        return {
            items: (data ?? []).map(row => ({
                id: row.id,
                slug: row.slug,
                title: row.name,
                subtitle: row.description,
                imageUrl: row.image_url,
                meta:
                    `${row.estimated_minutes} min · ${row.level}`,
                section
            })),
            total: count ?? 0,
            page,
            pageSize
        };
    }

    if (section === "exercises") {
        let query = db
            .from("exercise_catalog")
            .select(
                "id,slug,name,region_label,difficulty,media",
                { count: "exact" }
            )
            .eq("status", "published");

        if (q) {
            query = query.ilike("name", searchText(q));
        }

        if (level) {
            query = query.eq("difficulty", level);
        }

        const { data, error, count } = await query
            .order("name")
            .order("id")
            .range(from, to);

        checkDbError(error, "explore exercises");

        return {
            items: (data ?? []).map(row => ({
                id: row.id,
                slug: row.slug,
                title: row.name,
                subtitle: row.region_label ?? "Exercise",
                imageUrl: exerciseImage(row.media),
                meta: row.difficulty,
                section
            })),
            total: count ?? 0,
            page,
            pageSize
        };
    }

    const kind =
        section === "mobility" ? "mobility" : "guide";

    let query = db
        .from("explore_resources")
        .select(
            "id,slug,title,summary,cover_url,duration_minutes,featured_rank",
            { count: "exact" }
        )
        .eq("kind", kind)
        .eq("published", true);

    if (q) {
        query = query.ilike("title", searchText(q));
    }

    const { data, error, count } = await query
        .order("featured_rank", {
            ascending: true,
            nullsFirst: false
        })
        .order("title")
        .order("id")
        .range(from, to);

    checkDbError(error, `explore ${kind}`);

    return {
        items: (data ?? []).map(row => ({
            id: row.id,
            slug: row.slug,
            title: row.title,
            subtitle: row.summary,
            imageUrl: row.cover_url,
            meta:
                kind === "mobility"
                    ? `${row.duration_minutes} min · Guided`
                    : `${row.duration_minutes} min read`,
            section
        })),
        total: count ?? 0,
        page,
        pageSize
    };
}

export async function exploreHome() {
    const sections: ExploreSection[] = [
        "workouts",
        "programs",
        "exercises",
        "mobility",
        "learn"
    ];

    const results = await Promise.allSettled(
        sections.map(section =>
            listSection(section, {
                page: 1,
                pageSize: 4,
                q: ""
            })
        )
    );

    const home: Record<string, ExploreCard[]> = {};
    const unavailable: ExploreSection[] = [];

    for (const [index, section] of sections.entries()) {
        const result = results[index];

        if (result.status === "fulfilled") {
            home[section] = result.value.items as ExploreCard[];
        } else {
            console.error(
                `[explore] ${section} unavailable:`,
                result.reason
            );

            home[section] = [];
            unavailable.push(section);
        }
    }

    return {
        sections: home,
        unavailable
    };
}

export async function getResource(slug: string) {
    const { data, error } = await db
        .from("explore_resources")
        .select(
            "id,slug,kind,title,summary,cover_url,duration_minutes,steps,body,tags"
        )
        .eq("slug", slug)
        .eq("published", true)
        .maybeSingle();

    checkDbError(error, "get explore resource");

    return data;
}