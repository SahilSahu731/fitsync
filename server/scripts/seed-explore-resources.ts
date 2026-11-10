import "dotenv/config";

import { db } from "../src/config/supabase.js";

type Step = {
    title: string;
    seconds: number;
    instruction: string;
};

type ParagraphSection = {
    heading: string;
    paragraphs: string[];
};

type Seed = {
    slug: string;
    kind: "mobility" | "guide";
    title: string;
    summary: string;
    duration_minutes: number;
    tags: string[];
    steps?: Step[];
    body?: ParagraphSection[];
    featured_rank: number;
    published: boolean;
};

const resources: Seed[] = [
    {
        kind: "mobility",
        slug: "upper-body-warm-up",
        title: "Upper-body warm-up",
        summary:
            "Prepare shoulders, upper back and pressing movements.",
        duration_minutes: 5,
        tags: ["Upper body", "Warm-up"],
        featured_rank: 1,
        published: true,
        steps: [
            {
                title: "Shoulder circles",
                seconds: 60,
                instruction:
                    "Move arms in controlled circles. Start small and gradually widen the motion."
            },
            {
                title: "Arm swings",
                seconds: 60,
                instruction:
                    "Swing arms gently across the chest, without forcing the range."
            },
            {
                title: "Wall slides",
                seconds: 60,
                instruction:
                    "With back near a wall, slowly slide arms upward and back down."
            },
            {
                title: "Thoracic rotations",
                seconds: 60,
                instruction:
                    "On hands and knees, rotate your upper back gently to each side."
            },
            {
                title: "Easy practice reps",
                seconds: 60,
                instruction:
                    "Perform light versions of your first workout movement with excellent control."
            }
        ]
    },
    {
        kind: "mobility",
        slug: "hip-mobility-reset",
        title: "Hip mobility reset",
        summary:
            "A gentle routine for comfortable hip movement.",
        duration_minutes: 6,
        tags: ["Hips", "Mobility"],
        featured_rank: 2,
        published: true,
        steps: [
            {
                title: "Standing hip circles",
                seconds: 60,
                instruction:
                    "Hold a stable surface and draw slow circles with one knee. Switch sides halfway."
            },
            {
                title: "Supported deep squat",
                seconds: 60,
                instruction:
                    "Hold onto a door frame or sturdy support, descend only as comfortably as you can."
            },
            {
                title: "Half-kneeling hip stretch",
                seconds: 90,
                instruction:
                    "Tuck pelvis slightly and move forward until you feel a mild stretch. Switch sides halfway."
            },
            {
                title: "90/90 hip switches",
                seconds: 90,
                instruction:
                    "Seated on the floor, rotate bent knees side to side within a comfortable range."
            },
            {
                title: "Standing leg swings",
                seconds: 60,
                instruction:
                    "Gently swing each leg forward and back while holding a support."
            }
        ]
    },
    {
        kind: "mobility",
        slug: "desk-break",
        title: "Desk break movement",
        summary:
            "Five minutes away from your chair to move and reset.",
        duration_minutes: 5,
        tags: ["Office", "Recovery"],
        featured_rank: 3,
        published: true,
        steps: [
            {
                title: "Easy walk",
                seconds: 90,
                instruction:
                    "Walk at a relaxed pace and let the arms swing naturally."
            },
            {
                title: "Gentle neck turns",
                seconds: 45,
                instruction:
                    "Turn your head slowly side to side; do not pull or force it."
            },
            {
                title: "Shoulder rolls",
                seconds: 45,
                instruction:
                    "Roll both shoulders backward, then forward, using a relaxed motion."
            },
            {
                title: "Standing reach",
                seconds: 60,
                instruction:
                    "Reach upward, breathe steadily and avoid arching the lower back."
            },
            {
                title: "Sit-to-stand",
                seconds: 60,
                instruction:
                    "Rise from a stable chair and sit back down at a controlled pace."
            }
        ]
    },
    {
        kind: "mobility",
        slug: "leg-day-warm-up",
        title: "Leg-day warm-up",
        summary:
            "An easy lead-in to squats, lunges and lower-body training.",
        duration_minutes: 6,
        tags: ["Legs", "Warm-up"],
        featured_rank: 4,
        published: true,
        steps: [
            {
                title: "Brisk walk",
                seconds: 90,
                instruction:
                    "Walk or march in place until you feel comfortably warmer."
            },
            {
                title: "Ankle rocks",
                seconds: 60,
                instruction:
                    "Move your knee gently over the toes while keeping the heel on the ground."
            },
            {
                title: "Hip hinges",
                seconds: 60,
                instruction:
                    "Push hips backward with a neutral spine and return to standing."
            },
            {
                title: "Bodyweight squats",
                seconds: 90,
                instruction:
                    "Use a comfortable depth and smooth controlled reps."
            },
            {
                title: "Light practice sets",
                seconds: 60,
                instruction:
                    "Use an easier variation of the first strength exercise."
            }
        ]
    },
    {
        kind: "mobility",
        slug: "quick-cooldown",
        title: "Quick workout cooldown",
        summary:
            "Downshift gradually after your training session.",
        duration_minutes: 5,
        tags: ["Cooldown", "Recovery"],
        featured_rank: 5,
        published: true,
        steps: [
            {
                title: "Slow walk",
                seconds: 120,
                instruction:
                    "Gradually reduce effort and let your breathing settle."
            },
            {
                title: "Calf stretch",
                seconds: 60,
                instruction:
                    "Lean against a wall and gently stretch each calf."
            },
            {
                title: "Chest opening",
                seconds: 60,
                instruction:
                    "Draw shoulders back gently and avoid forcing the range."
            },
            {
                title: "Relaxed breathing",
                seconds: 60,
                instruction:
                    "Breathe naturally while seated or standing comfortably."
            }
        ]
    },
    {
        kind: "mobility",
        slug: "ankle-mobility",
        title: "Ankle mobility basics",
        summary:
            "Simple ankle movement before lower-body activity.",
        duration_minutes: 4,
        tags: ["Ankles", "Mobility"],
        featured_rank: 6,
        published: true,
        steps: [
            {
                title: "Ankle circles",
                seconds: 60,
                instruction:
                    "Rotate each foot slowly in both directions."
            },
            {
                title: "Wall knee drives",
                seconds: 90,
                instruction:
                    "Keeping your heel planted, guide the knee toward a wall within a comfortable range. Switch sides."
            },
            {
                title: "Supported heel raises",
                seconds: 90,
                instruction:
                    "Hold a railing and rise onto your toes, then lower slowly."
            }
        ]
    },
    {
        kind: "mobility",
        slug: "morning-movement",
        title: "Morning movement flow",
        summary:
            "A low-pressure movement routine to start your day.",
        duration_minutes: 5,
        tags: ["Morning", "Full body"],
        featured_rank: 7,
        published: true,
        steps: [
            {
                title: "Easy marching",
                seconds: 60,
                instruction:
                    "March slowly, coordinating natural arm movement."
            },
            {
                title: "Standing side bends",
                seconds: 60,
                instruction:
                    "Reach overhead and lean gently side to side."
            },
            {
                title: "Shoulder circles",
                seconds: 60,
                instruction:
                    "Use comfortable small-to-medium circles."
            },
            {
                title: "Hip hinges",
                seconds: 60,
                instruction:
                    "Practice a gentle hip hinge with soft knees."
            },
            {
                title: "Supported squats",
                seconds: 60,
                instruction:
                    "Use a chair or railing and perform slow easy squats."
            }
        ]
    },
    {
        kind: "mobility",
        slug: "post-run-reset",
        title: "Post-run reset",
        summary:
            "Gentle lower-body movements after an easy run.",
        duration_minutes: 5,
        tags: ["Running", "Recovery"],
        featured_rank: 8,
        published: true,
        steps: [
            {
                title: "Slow walk",
                seconds: 120,
                instruction:
                    "Walk slowly until breathing becomes comfortable."
            },
            {
                title: "Calf stretch",
                seconds: 60,
                instruction:
                    "Use a wall to support a light calf stretch, switching sides."
            },
            {
                title: "Standing quad stretch",
                seconds: 60,
                instruction:
                    "Use stable support, hold the foot only if comfortable, and switch sides."
            },
            {
                title: "Hip flexor stretch",
                seconds: 60,
                instruction:
                    "Step into a comfortable split stance and gently shift weight forward."
            }
        ]
    },
    {
        kind: "guide",
        slug: "progressive-overload",
        title: "Progressive overload explained",
        summary:
            "How to make training gradually more challenging without guessing.",
        duration_minutes: 4,
        tags: ["Strength", "Basics"],
        featured_rank: 1,
        published: true,
        body: [
            {
                heading: "What it means",
                paragraphs: [
                    "Progressive overload is a gradual increase in the training challenge over time. You can progress by adding reps, load, sets or improving technique, rather than increasing weight every session."
                ]
            },
            {
                heading: "A simple example",
                paragraphs: [
                    "Suppose your target is 3 sets of 8–12 bench-press reps. Keep the same load while your reps improve toward the top of the range with consistent technique.",
                    "Once you can achieve all target sets comfortably, consider a small load increase and work upward again."
                ]
            },
            {
                heading: "What to watch",
                paragraphs: [
                    "Track completed sets, recovery and movement quality. A single difficult session does not mean your plan has failed.",
                    "Avoid sacrificing technique just to increase the number on the bar."
                ]
            }
        ]
    },
    {
        kind: "guide",
        slug: "first-week-at-gym",
        title: "Your first week at the gym",
        summary:
            "A simple plan for beginning strength training with confidence.",
        duration_minutes: 5,
        tags: ["Beginner", "Gym"],
        featured_rank: 2,
        published: true,
        body: [
            {
                heading: "Keep it manageable",
                paragraphs: [
                    "Start with two or three full-body sessions on nonconsecutive days. Learn basic movement patterns before worrying about complicated splits."
                ]
            },
            {
                heading: "Choose a few movements",
                paragraphs: [
                    "Include a squat pattern, hip hinge, push, pull and comfortable core work. Machines or easier variations are fine."
                ]
            },
            {
                heading: "Leave room to learn",
                paragraphs: [
                    "Use loads that allow smooth control. Write down your sets and reps so the following session is easy to plan. Ask qualified staff for help with unfamiliar equipment."
                ]
            }
        ]
    },
    {
        kind: "guide",
        slug: "understanding-rpe",
        title: "RPE and reps in reserve",
        summary:
            "Understand training effort without relying only on weight.",
        duration_minutes: 3,
        tags: ["Strength", "Tracking"],
        featured_rank: 3,
        published: true,
        body: [
            {
                heading: "Rate your effort",
                paragraphs: [
                    "RPE is a subjective rating of how challenging a set feels. Reps in reserve (RIR) estimates how many more technically sound reps you could have done."
                ]
            },
            {
                heading: "Useful estimates",
                paragraphs: [
                    "An RPE around 8 is commonly interpreted as roughly two reps in reserve, but these scales are approximate and take practice."
                ]
            },
            {
                heading: "Use it sensibly",
                paragraphs: [
                    "Be consistent with how you rate sets. You do not need to train to failure on every set to progress."
                ]
            }
        ]
    },
    {
        kind: "guide",
        slug: "building-a-routine",
        title: "Build a balanced workout",
        summary:
            "Select movements, sets and exercises that work together.",
        duration_minutes: 4,
        tags: ["Programming", "Beginner"],
        featured_rank: 4,
        published: true,
        body: [
            {
                heading: "Start with a goal",
                paragraphs: [
                    "Choose whether you're prioritizing strength, muscle, general fitness or a specific skill. Keep the goal practical and measurable."
                ]
            },
            {
                heading: "Cover major patterns",
                paragraphs: [
                    "Most general strength routines benefit from pushing, pulling, knee-dominant and hip-dominant movements, plus appropriate core work."
                ]
            },
            {
                heading: "Keep it repeatable",
                paragraphs: [
                    "Select a manageable number of exercises that fit your available time. Consistently repeating a simple plan is often more useful than frequently changing everything."
                ]
            }
        ]
    },
    {
        kind: "guide",
        slug: "warm-up-basics",
        title: "How to warm up for lifting",
        summary:
            "Make the transition into your working sets smoother.",
        duration_minutes: 3,
        tags: ["Warm-up", "Technique"],
        featured_rank: 5,
        published: true,
        body: [
            {
                heading: "Raise your temperature",
                paragraphs: [
                    "Start with a few minutes of easy movement that matches what you're about to do."
                ]
            },
            {
                heading: "Rehearse the skill",
                paragraphs: [
                    "Use controlled reps of your first exercise at an easier load before moving into challenging work sets."
                ]
            },
            {
                heading: "Make it specific",
                paragraphs: [
                    "Warm-ups don't need to be long or exhausting. Prioritize joints and movements used in the upcoming session."
                ]
            }
        ]
    },
    {
        kind: "guide",
        slug: "training-consistency",
        title: "Train consistently on a busy schedule",
        summary:
            "Keep your plan useful even when your week changes.",
        duration_minutes: 3,
        tags: ["Habits", "Planning"],
        featured_rank: 6,
        published: true,
        body: [
            {
                heading: "Have a minimum session",
                paragraphs: [
                    "If a 45-minute workout is unrealistic today, doing a shorter session with your main lifts may be better than abandoning the week."
                ]
            },
            {
                heading: "Track sessions, not perfection",
                paragraphs: [
                    "Compare your activity across several weeks instead of judging yourself by a missed day. Rest days are normal."
                ]
            },
            {
                heading: "Plan ahead",
                paragraphs: [
                    "Pick times and locations you can usually access and prepare alternative exercises for busy or crowded gyms."
                ]
            }
        ]
    },
    {
        kind: "guide",
        slug: "rest-between-sets",
        title: "How long should you rest?",
        summary:
            "Use rest periods that support performance and technique.",
        duration_minutes: 3,
        tags: ["Technique", "Recovery"],
        featured_rank: 7,
        published: true,
        body: [
            {
                heading: "Match rest to the work",
                paragraphs: [
                    "Hard compound strength sets often benefit from longer rest than lighter accessory movements. A rough starting point is two to three minutes for demanding lifts, adjusted for your needs."
                ]
            },
            {
                heading: "Watch your performance",
                paragraphs: [
                    "If your reps drop sharply because you're rushed, you may need more recovery. Short rest is not automatically better."
                ]
            },
            {
                heading: "Use the timer flexibly",
                paragraphs: [
                    "Treat the rest timer as a reminder, not a command. Begin the next set when you feel able to perform it safely and effectively."
                ]
            }
        ]
    },
    {
        kind: "guide",
        slug: "exercise-substitutions",
        title: "How to substitute exercises",
        summary:
            "Keep a workout moving when equipment is unavailable.",
        duration_minutes: 4,
        tags: ["Equipment", "Planning"],
        featured_rank: 8,
        published: true,
        body: [
            {
                heading: "Match the movement",
                paragraphs: [
                    "Replace a movement with another that trains a similar pattern and relevant muscles. A dumbbell press may substitute for a barbell press, depending on the goal."
                ]
            },
            {
                heading: "Respect your skill and comfort",
                paragraphs: [
                    "An alternative may require a different weight, range of motion or setup. Begin conservatively when trying an unfamiliar version."
                ]
            },
            {
                heading: "Track separately",
                paragraphs: [
                    "Compare performance within the same exercise variation. Loads from different machines or implements may not be directly comparable."
                ]
            }
        ]
    }
];

async function main() {
    const { error } = await db
        .from("explore_resources")
        .upsert(
            resources.map(resource => ({
                ...resource,
                steps: resource.steps ?? [],
                body: resource.body ?? [],
                cover_url: null
            })),
            { onConflict: "slug", ignoreDuplicates: true }
        );

    if (error) {
        throw error;
    }

    console.log(
        `Seeded ${resources.length} published Explore resources.`
    );
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});