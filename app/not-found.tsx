import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-6xl font-bold">404</h1>
        <h2 className="text-2xl font-medium">Sidan hittades inte</h2>
        <p className="text-muted-foreground max-w-md">
          Sidan du letar efter finns inte eller har flyttats.
        </p>
      </div>
      <Button asChild>
        <Link href="/">
          <Home className="mr-2 size-4" />
          Till startsidan
        </Link>
      </Button>
    </div>
  );
}