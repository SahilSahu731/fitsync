import { PublicShell } from "@/components/shell";
import { HeroSection } from "@/components/home/hero-section";
import { FAQSection } from "@/components/home/faq-section";
import { ProductDemo } from "@/components/marketing/product-demo";
import {
  ClosingSection,
  HealthSection,
  MovementSection,
  PhilosophySection,
  PlansSection,
  TrainingSection,
} from "@/components/marketing/sections";

export default function Home() {
  return (
    <PublicShell>
      <main id="main" className="overflow-x-clip bg-black">
        <HeroSection />
        <PhilosophySection />
        <ProductDemo />
        <TrainingSection />
        <HealthSection />
        <MovementSection />
        <PlansSection />
        <FAQSection />
        <ClosingSection />
      </main>
    </PublicShell>
  );
}
