// Shared navigation and footer destinations. Keep unpublished destinations empty.
export const mainLinks = [
  { href: "/features", label: "Why FitSync", description: "Get to know your training companion." },
  { href: "/programs", label: "Training", description: "Find a program that fits your week." },
  { href: "/exercises", label: "Exercises", description: "Learn the movement. Make it yours." },
];

export const footerGroups = [
  {
    title: "Explore FitSync",
    links: [
      { href: "/features", label: "Features & overview" },
      { href: "/programs", label: "Training programs" },
      { href: "/exercises", label: "Exercise library" },
      { href: "/#app-preview", label: "Mobile app preview" },
    ],
  },
  {
    title: "Find your rhythm",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#movement", label: "Ways to move" },
      { href: "/#your-rhythm", label: "Plan your week" },
      { href: "/#questions", label: "Common questions" },
    ],
  },
];

function websiteUrl(value: string | undefined) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

// Optional published URLs. No fabricated store, social, or legal destinations.
export const publishedLinks = {
  privacy: websiteUrl(process.env.NEXT_PUBLIC_PRIVACY_URL),
  terms: websiteUrl(process.env.NEXT_PUBLIC_TERMS_URL),
  googlePlay: websiteUrl(process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL),
  appStore: websiteUrl(process.env.NEXT_PUBLIC_APP_STORE_URL),
  instagram: websiteUrl(process.env.NEXT_PUBLIC_INSTAGRAM_URL),
  youtube: websiteUrl(process.env.NEXT_PUBLIC_YOUTUBE_URL),
};
