import type { Metadata } from "next";
import { Receipt } from "@phosphor-icons/react/dist/ssr";

export const metadata: Metadata = {
  title: "Kolla din inkorg — Kvitty",
};

export default async function MagicLinkSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <a href="/" className="flex flex-col items-center gap-2 font-medium">
            <div className="flex size-8 items-center justify-center rounded-md">
              <Receipt className="size-6" weight="duotone" />
            </div>
            <span className="sr-only">Kvitty</span>
          </a>
          <h1 className="text-xl font-bold">Kolla din inkorg</h1>
          <p className="text-muted-foreground text-sm">
            Vi har skickat en inloggningslänk till{" "}
            <span className="font-medium">{email}</span>
          </p>
          <p className="text-muted-foreground text-sm mt-4">
            Klicka på länken i mejlet för att logga in. Länken är giltig i 10
            minuter.
          </p>
          <a
            href="/login"
            className="text-sm underline mt-4 text-muted-foreground"
          >
            Tillbaka till inloggning
          </a>
        </div>
      </div>
    </div>
  );
}
