"use client";

import Image from "next/image";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";

export default function WelcomePage() {
  return (
    <Suspense>
      <WelcomeContent />
    </Suspense>
  );
}

function WelcomeContent() {
  const params = useSearchParams();
  const name = params.get("name") || "there";

  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-ruka-primary to-ruka-primary-dark px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
        <div className="mx-auto mb-6 flex flex-col items-center">
          <Image src="/logo.png" alt="RukaPay" width={64} height={64} className="mb-4" />
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-ruka-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {name}!
        </h1>
        <p className="mt-3 text-gray-500">
          Your RukaPay account has been created successfully. Download the
          RukaPay app to start transacting.
        </p>
        <div className="mt-8 space-y-3">
          <a
            href="https://play.google.com/store"
            className="block rounded-xl bg-ruka-primary py-3 text-sm font-semibold text-white transition hover:bg-ruka-primary-dark"
          >
            Get it on Google Play
          </a>
          <a
            href="https://apps.apple.com"
            className="block rounded-xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            Download on App Store
          </a>
        </div>
      </div>
    </div>
  );
}
