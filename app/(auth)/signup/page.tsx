import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignupForm } from "@/components/signup-form";

export const metadata: Metadata = {
  title: "Registrera dig — Kvitty",
};

export default function SignupPage() {
  const registrationsEnabled =
    process.env.REGISTRATIONS_ENABLED !== "false";

  if (!registrationsEnabled) {
    redirect("/login");
  }

  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <SignupForm />
      </div>
    </div>
  );
}
