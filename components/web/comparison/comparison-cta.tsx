import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";

export function ComparisonCTA() {
  return (
    <section className="px-5 sm:px-[5%] pb-20 sm:pb-28">
      <div className="mx-auto max-w-[1280px]">
        <div className="ring-1 ring-border rounded-2xl p-8 sm:p-12 bg-card text-center">
          <h2 className="font-medium text-2xl sm:text-3xl tracking-tight mb-3">
            Redo att testa Kvitty?
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto mb-8">
            Kom igång gratis och se själv hur enkelt bokföring kan vara. Ingen
            bindningstid, avsluta när du vill.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Button asChild size="lg" className="gap-1.5">
              <Link href="/login">
                Kom igång gratis
                <ArrowRight weight="bold" className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <a href="/#priser">Se alla priser</a>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-6">
            Inget kreditkort krävs. Testa utan förpliktelser.
          </p>
        </div>
      </div>
    </section>
  );
}
