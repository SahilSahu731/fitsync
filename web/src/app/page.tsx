import { PublicShell } from "@/components/shell";
import { ScrollBar } from "@/components/motion";
import { HeroSection } from "@/components/home/hero-section";
import { MovementTicker } from "@/components/home/movement-ticker";
import { StorySection } from "@/components/home/story-section";
import { FeaturesSection } from "@/components/home/features-section";
import { RhythmSection } from "@/components/home/rhythm-section";
import { EquipmentSection } from "@/components/home/equipment-section";
import { FAQSection } from "@/components/home/faq-section";
import { CTASection } from "@/components/home/cta-section";

// Reorder or remove sections here. Copy and demo data: components/home/content.ts.
export default function Home() {
  return (
    <PublicShell>
      <main id="main" className="overflow-x-clip bg-background">
        <ScrollBar />
        <HeroSection />
        <MovementTicker />
        <StorySection />
        <FeaturesSection />
        <RhythmSection />
        <EquipmentSection />
        <FAQSection />
        <CTASection />
      </main>
    </PublicShell>
  );
}
