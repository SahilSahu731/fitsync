import { Plus } from "lucide-react";
import { Reveal } from "@/components/motion";
import { container, headline } from "@/components/marketing/shared";
import { questions } from "./content";

export function FAQSection() {
  return (
    <section
      id="questions"
      aria-labelledby="faq-heading"
      className={`${container} grid scroll-mt-28 gap-12 py-24 sm:py-32 lg:grid-cols-[.85fr_1.15fr] lg:gap-24`}
    >
      <Reveal>
        <p className="text-xs tracking-[.12em] text-white/55 uppercase">A little clarity</p>
        <h2 id="faq-heading" className={`mt-6 ${headline}`}>
          Good questions.
        </h2>
        <p className="mt-6 max-w-xs text-sm leading-7 text-white/50">
          A few things to know before your first move.
        </p>
      </Reveal>
      <Reveal>
        <div className="space-y-3">
          {questions.map(({ question, answer }) => (
            <details
              key={question}
              name="fitsync-faq"
              className="group rounded-2xl bg-panel px-6 transition-colors open:bg-panel-raised sm:px-7"
            >
              <summary className="flex min-h-20 cursor-pointer list-none items-center justify-between gap-6 py-5 text-sm font-medium marker:content-none [&::-webkit-details-marker]:hidden sm:text-base">
                {question}
                <Plus
                  size={19}
                  className="shrink-0 text-white/50 transition-transform duration-300 group-open:rotate-45"
                />
              </summary>
              <p className="max-w-xl pb-7 text-sm leading-7 text-white/55">{answer}</p>
            </details>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
