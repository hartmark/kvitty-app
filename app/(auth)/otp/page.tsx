import type { Metadata } from "next";
import { Suspense } from "react";
import { OTPForm } from "@/components/otp-form";

export const metadata: Metadata = {
  title: "Verifiera kod — Kvitty",
};

export default function OTPPage() {
  return (
    <div className="bg-background flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Suspense fallback={null}>
          <OTPForm />
        </Suspense>
      </div>
    </div>
  )
}
