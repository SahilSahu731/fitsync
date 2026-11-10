import { Plus } from "lucide-react";
import { Reveal } from "@/components/motion";
import { questions } from "./content";

export function FAQSection() {
  return (
    <section
      id="questions"
      aria-labelledby="faq-heading"
      className="mx-auto grid max-w-7xl gap-9 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[.8fr_1.2fr] lg:gap-20 lg:px-12"
    >
      <Reveal>
        <p className="mb-5 text-[10px] font-semibold tracking-[.16em] text-brand">
          BEFORE YOUR FIRST MOVE
        </p>
        <h2
          id="faq-heading"
          className="max-w-90 text-[clamp(2.2rem,4.4vw,3.5rem)] leading-[1.08] tracking-[-.045em]"
        >
          A few good
          <br />
          things to know.
        </h2>
        <p className="mt-5 max-w-70 text-base leading-7 text-muted">
          Keep the questions.
          <br />
          We’ll help with the starting point.
        </p>
      </Reveal>
      <Reveal delay={80}>
        <div className="border-t border-line">
          {questions.map(({ question, answer }) => (
            <details key={question} name="home-faq" className="group border-b border-line">
              <summary className="flex min-h-21 cursor-pointer list-none items-center justify-between gap-5 py-6 text-base font-medium transition-colors marker:content-none hover:text-brand [&::-webkit-details-marker]:hidden sm:text-lg">
                {question}
                <Plus
                  size={21}
                  strokeWidth={1.5}
                  className="text-muted transition-transform group-open:rotate-45 group-open:text-brand"
                />
              </summary>
              <p className="max-w-xl pr-6 pb-7 text-sm leading-7 text-muted sm:text-base">
                {answer}
              </p>
            </details>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
