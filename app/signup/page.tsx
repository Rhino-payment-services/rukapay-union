"use client";

import Image from "next/image";
import { useState, useCallback, type FormEvent } from "react";

type SignupMethod = "phone" | "email";

interface FormData {
  phone: string;
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  idType: string;
  idNumber: string;
  walletUsername: string;
  referralCode: string;
  pin: string;
  confirmPin: string;
  otp: string;
}

const initialForm: FormData = {
  phone: "",
  email: "",
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  gender: "",
  idType: "",
  idNumber: "",
  walletUsername: "",
  referralCode: "",
  pin: "",
  confirmPin: "",
  otp: "",
};

async function apiCall(action: string, body: Record<string, unknown>) {
  const res = await fetch("/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || data.error || "Request failed");
  return data;
}

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState<SignupMethod>("phone");
  const [form, setForm] = useState<FormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [existingAccount, setExistingAccount] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );

  const totalSteps = 5;

  const set = useCallback(
    (field: keyof FormData, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
      setError("");
    },
    []
  );

  function startOtpTimer() {
    setOtpCountdown(300);
    const interval = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function formatCountdown(s: number) {
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  }

  async function checkUsername(username: string) {
    if (username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    try {
      await apiCall("check-username", { username });
      setUsernameAvailable(true);
    } catch {
      setUsernameAvailable(false);
    }
  }

  function validateStep(): string | null {
    switch (step) {
      case 1:
        if (method === "phone" && !/^(0[7|3]\d{8}|256[7|3]\d{8})$/.test(form.phone))
          return "Enter a valid Uganda phone number";
        if (method === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
          return "Enter a valid email address";
        return null;
      case 2:
        if (form.firstName.length < 2) return "First name must be at least 2 characters";
        if (form.lastName.length < 2) return "Last name must be at least 2 characters";
        if (!form.dateOfBirth) return "Date of birth is required";
        if (!form.gender) return "Please select your gender";
        return null;
      case 3:
        if (!form.idType) return "Please select an ID type";
        if (!form.idNumber) return "ID number is required";
        if (form.walletUsername.length < 3) return "Wallet username must be at least 3 characters";
        if (usernameAvailable === false) return "That username is not available";
        return null;
      case 4:
        if (!/^\d{5}$/.test(form.pin)) return "PIN must be exactly 5 digits";
        if (form.pin !== form.confirmPin) return "PINs do not match";
        return null;
      case 5:
        if (!/^\d{6}$/.test(form.otp)) return "OTP must be exactly 6 digits";
        return null;
      default:
        return null;
    }
  }

  async function handleNext(e: FormEvent) {
    e.preventDefault();
    const err = validateStep();
    if (err) {
      setError(err);
      return;
    }
    setLoading(true);
    setError("");

    try {
      if (step === 1) {
        setExistingAccount(false);
        if (method === "phone") {
          const preview = await apiCall("check-phone", { phone: form.phone });
          if (preview.hasAccount) {
            setExistingAccount(true);
            setLoading(false);
            return;
          }
        }
        setStep(2);
      } else if (step === 2) {
        setStep(3);
      } else if (step === 3) {
        setStep(4);
      } else if (step === 4) {
        const payload: Record<string, string> = {
          pin: form.pin,
          firstName: form.firstName,
          lastName: form.lastName,
          gender: form.gender.toLowerCase(),
          dateOfBirth: form.dateOfBirth,
          nationalId: form.idNumber.toUpperCase(),
          walletUsername: form.walletUsername,
          subscriberType: "INDIVIDUAL",
          country: "UG",
          role: "USER",
          userType: "SUBSCRIBER",
          channel: "WEB",
        };
        if (method === "phone") payload.phone = form.phone;
        if (method === "email" || form.email) payload.email = form.email;
        if (form.idType) payload.idType = form.idType;
        if (form.referralCode) payload.referralCode = form.referralCode;

        await apiCall("register", payload);

        const otpPayload: Record<string, string> = { purpose: "REGISTRATION" };
        if (method === "phone") otpPayload.phone = form.phone;
        else otpPayload.email = form.email;
        await apiCall("send-otp", otpPayload);

        startOtpTimer();
        setStep(5);
      } else if (step === 5) {
        const verifyPayload: Record<string, string> = { otp: form.otp };
        if (method === "phone") verifyPayload.phone = form.phone;
        else verifyPayload.email = form.email;
        await apiCall("verify-otp", verifyPayload);
        window.location.href = `/welcome?name=${encodeURIComponent(form.firstName)}`;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      if (
        msg.toLowerCase().includes("already registered") ||
        msg.toLowerCase().includes("already exists")
      ) {
        setExistingAccount(true);
        setStep(1);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function resendOtp() {
    setLoading(true);
    try {
      const payload: Record<string, string> = { purpose: "REGISTRATION" };
      if (method === "phone") payload.phone = form.phone;
      else payload.email = form.email;
      await apiCall(method === "email" ? "resend-otp" : "send-otp", payload);
      startOtpTimer();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  }

  const stepLabels = ["Contact", "Personal", "Identity", "PIN", "Verify"];

  return (
    <div className="flex flex-1 flex-col items-center justify-start bg-slate-50 px-4 py-8 sm:py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="RukaPay"
            width={48}
            height={48}
            className="mb-2"
            priority
          />
          <h1 className="text-2xl font-bold text-ruka-primary tracking-tight">
            RukaPay
          </h1>
          <p className="mt-1 text-sm text-ruka-text-tertiary">Create your account</p>
        </div>

        {/* Progress */}
        <div className="mb-8 flex items-center justify-between px-2">
          {stepLabels.map((label, i) => {
            const num = i + 1;
            const active = num === step;
            const done = num < step;
            return (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    done
                      ? "bg-ruka-secondary text-white"
                      : active
                        ? "bg-ruka-primary text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {done ? "✓" : num}
                </div>
                <span
                  className={`text-xs ${active ? "font-semibold text-ruka-primary" : "text-gray-400"}`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Form Card */}
        <form
          onSubmit={handleNext}
          className="rounded-2xl bg-white p-6 shadow-lg sm:p-8"
        >
          {/* Step 1: Contact */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Contact Details
              </h2>
              <div className="flex gap-2 rounded-lg bg-gray-100 p-1">
                {(["phone", "email"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMethod(m)}
                    className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
                      method === m
                        ? "bg-white text-ruka-primary shadow-sm"
                        : "text-gray-500"
                    }`}
                  >
                    {m === "phone" ? "Phone Number" : "Email Address"}
                  </button>
                ))}
              </div>
              {method === "phone" ? (
                <Input
                  label="Phone Number"
                  placeholder="07XXXXXXXX"
                  type="tel"
                  value={form.phone}
                  onChange={(v) => set("phone", v)}
                />
              ) : (
                <Input
                  label="Email Address"
                  placeholder="you@example.com"
                  type="email"
                  value={form.email}
                  onChange={(v) => set("email", v)}
                />
              )}

              {existingAccount && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-800">
                    This {method === "phone" ? "phone number" : "email"} is
                    already registered with RukaPay.
                  </p>
                  <p className="mt-1 text-sm text-amber-700">
                    Please sign in using the RukaPay mobile app, or try a
                    different {method === "phone" ? "number" : "email"}.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Personal */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Personal Details
              </h2>
              <Input
                label="First Name"
                value={form.firstName}
                onChange={(v) => set("firstName", v)}
              />
              <Input
                label="Last Name"
                value={form.lastName}
                onChange={(v) => set("lastName", v)}
              />
              <Input
                label="Date of Birth"
                type="date"
                value={form.dateOfBirth}
                onChange={(v) => set("dateOfBirth", v)}
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Gender
                </label>
                <div className="flex gap-3">
                  {["Male", "Female"].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => set("gender", g)}
                      className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition ${
                        form.gender === g
                          ? "border-ruka-blue bg-ruka-primary-light text-ruka-primary"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Identity */}
          {step === 3 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Additional Information
              </h2>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  ID Type
                </label>
                <select
                  value={form.idType}
                  onChange={(e) => set("idType", e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-ruka-primary focus:ring-1 focus:ring-ruka-primary focus:outline-none"
                >
                  <option value="">Select ID type</option>
                  <option value="National ID">National ID</option>
                  <option value="Passport">Passport</option>
                </select>
              </div>
              <Input
                label="ID Number"
                value={form.idNumber}
                onChange={(v) => set("idNumber", v)}
                placeholder="e.g. CM12345678ABCD"
              />
              <div>
                <Input
                  label="Wallet Username"
                  value={form.walletUsername}
                  onChange={(v) => {
                    set("walletUsername", v);
                    checkUsername(v);
                  }}
                  placeholder="Choose a unique username"
                />
                {usernameAvailable === true && form.walletUsername.length >= 3 && (
                  <p className="mt-1 text-xs text-ruka-secondary">Username is available</p>
                )}
                {usernameAvailable === false && (
                  <p className="mt-1 text-xs text-ruka-error">Username is not available</p>
                )}
              </div>
              <Input
                label="Referral Code (optional)"
                value={form.referralCode}
                onChange={(v) => set("referralCode", v)}
                placeholder="Enter referral code"
              />
            </div>
          )}

          {/* Step 4: PIN */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Create Your PIN
              </h2>
              <p className="text-sm text-gray-500">
                Create a 5-digit PIN to secure your account.
              </p>
              <Input
                label="PIN"
                type="password"
                maxLength={5}
                value={form.pin}
                onChange={(v) => set("pin", v.replace(/\D/g, ""))}
                placeholder="•••••"
              />
              <Input
                label="Confirm PIN"
                type="password"
                maxLength={5}
                value={form.confirmPin}
                onChange={(v) => set("confirmPin", v.replace(/\D/g, ""))}
                placeholder="•••••"
              />
            </div>
          )}

          {/* Step 5: OTP */}
          {step === 5 && (
            <div className="space-y-5">
              <h2 className="text-lg font-semibold text-gray-900">
                Verify Your Account
              </h2>
              <p className="text-sm text-gray-500">
                Enter the 6-digit code sent to your{" "}
                {method === "phone" ? "phone" : "email"}.
              </p>
              <Input
                label="Verification Code"
                maxLength={6}
                value={form.otp}
                onChange={(v) => set("otp", v.replace(/\D/g, ""))}
                placeholder="000000"
              />
              {otpCountdown > 0 ? (
                <p className="text-center text-sm text-gray-500">
                  Resend in {formatCountdown(otpCountdown)}
                </p>
              ) : (
                <button
                  type="button"
                  onClick={resendOtp}
                  className="w-full text-center text-sm font-medium text-ruka-primary"
                >
                  Resend Code
                </button>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-ruka-error">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <button
                type="button"
                onClick={() => {
                  setStep(step - 1);
                  setError("");
                }}
                className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-medium text-gray-600 transition hover:bg-gray-50"
              >
                Back
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-ruka-primary py-3 text-sm font-semibold text-white transition hover:bg-ruka-primary-dark disabled:opacity-50"
            >
              {loading
                ? "Please wait..."
                : step === totalSteps
                  ? "Verify & Complete"
                  : step === 4
                    ? "Create Account"
                    : "Continue"}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-gray-400">
          By creating an account, you agree to RukaPay&apos;s Terms of Service
          and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-ruka-primary focus:ring-1 focus:ring-ruka-primary focus:outline-none"
      />
    </div>
  );
}
