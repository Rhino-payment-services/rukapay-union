import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-ruka-primary to-ruka-primary-dark px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="RukaPay"
            width={80}
            height={80}
            className="mb-4"
            priority
          />
          <h1 className="text-4xl font-bold text-white tracking-tight">
            RukaPay
          </h1>
          <p className="mt-2 text-lg text-blue-200">
            Your digital wallet for fast, secure payments
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Welcome
          </h2>
          <p className="text-ruka-text-secondary mb-8">
            Create an account to start sending and receiving money instantly.
          </p>

          <Link
            href="/signup"
            className="block w-full rounded-xl bg-ruka-primary py-3.5 text-center text-base font-semibold text-white transition hover:bg-ruka-primary-dark"
          >
            Create Account
          </Link>

          <p className="mt-6 text-sm text-ruka-text-tertiary">
            Already have an account?{" "}
            <span className="font-medium text-ruka-primary">
              Use the RukaPay app to sign in
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
