
"use client";

import { Suspense, useState, useSyncExternalStore, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  FaCamera,
  FaGoogle,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa6";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const subscribeToHydration = () => () => {};

interface AuthFormProps {
  mode: "signin" | "signup";
  googleEnabled?: boolean;
}

function getRedirectPath(requestedPath: string) {
  try {
    const destination = new URL(requestedPath, "https://studiospace.local");
    if (
      requestedPath.startsWith("/") &&
      destination.origin === "https://studiospace.local" &&
      !["/login", "/register"].includes(destination.pathname.replace(/\/+$/, ""))
    ) {
      return `${destination.pathname}${destination.search}${destination.hash}`;
    }
  } catch {
    // Invalid destinations fall back to the home page.
  }
  return "/";
}

export default function AuthForm({ mode, googleEnabled = false }: AuthFormProps) {
  return (
    <Suspense fallback={<p className="p-8 text-center">Loading...</p>}>
      <AuthFormContent mode={mode} googleEnabled={googleEnabled} />
    </Suspense>
  );
}

function AuthFormContent({ mode, googleEnabled }: AuthFormProps) {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedPath = searchParams.get("next") || "/";
  // Resolve against a fixed origin so external URLs cannot become redirects.
  const redirectTo = getRedirectPath(requestedPath);
  const loginHref = `/login?next=${encodeURIComponent(redirectTo)}`;
  const registerHref = `/register?next=${encodeURIComponent(redirectTo)}`;

  const isSignUp = mode === "signup";

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Email and password authentication
  const handleSubmit = async (
    e: FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    const formData = new FormData(e.currentTarget);

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const password = String(formData.get("password") || "");
    const image = String(formData.get("image") || "").trim();

    // Sign-up password validation
    if (isSignUp) {
      if (
        password.length < 8 ||
        !/[A-Z]/.test(password) ||
        !/[a-z]/.test(password)
      ) {
        toast.error(
          "Password needs 8 characters, uppercase and lowercase letters."
        );
        return;
      }
    }

    try {
      setLoading(true);

      if (isSignUp) {
        // Register a new user
        const result = await authClient.signUp.email({
          name,
          email,
          password,
          ...(image ? { image } : {}),
        });

        if (result.error) {
          toast.error(result.error.message || "Registration failed");
          return;
        }

        toast.success("Account created successfully!");
        router.replace(result.data?.token ? redirectTo : loginHref);
        router.refresh();
      } else {
        // Sign in an existing user
        const result = await authClient.signIn.email({
          email,
          password,
        });

        if (result.error) {
          toast.error(result.error.message || "Invalid credentials");
          return;
        }

        toast.success("Signed in successfully!");
        router.replace(redirectTo);
        router.refresh();
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Google Authentication
  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);

      const result = await authClient.signIn.social({
        provider: "google",
        callbackURL: redirectTo,
      });

      if (result.error) {
        toast.error(result.error.message || "Google sign-in failed");
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("Unable to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-3"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-600 text-white">
            <FaCamera size={22} />
          </div>

          <h2 className="text-3xl font-bold text-slate-900">
            Studio<span className="text-green-600">Space</span>
          </h2>
        </Link>

        <Card className="rounded-2xl border-slate-200 bg-white shadow-sm">
          <CardContent className="p-6 sm:p-8">

            {/* Heading */}
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-slate-900">
                {isSignUp ? "Create Your Account" : "Welcome Back!"}
              </h1>

              <p className="mt-2 text-sm text-slate-500">
                {isSignUp
                  ? "Join StudioSpace and explore creative spaces"
                  : "Sign in to manage your studio bookings"}
              </p>
            </div>

            {/* Authentication Form */}
            <form method="post" onSubmit={handleSubmit} className="space-y-5">

              {/* Name */}
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    name="name"
                    placeholder="Enter your full name"
                    minLength={2}
                    required
                    className="h-11"
                  />
                </div>
              )}

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  autoComplete="email"
                  required
                  className="h-11"
                />
              </div>

              {/* Photo URL */}
              {isSignUp && (
                <div className="space-y-2">
                  <Label htmlFor="image">
                    Photo URL (Optional)
                  </Label>
                  <Input
                    id="image"
                    name="image"
                    type="url"
                    placeholder="https://example.com/photo.jpg"
                    className="h-11"
                  />
                </div>
              )}

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>

                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete={
                      isSignUp ? "new-password" : "current-password"
                    }
                    minLength={isSignUp ? 8 : undefined}
                    required
                    className="h-11 pr-12"
                  />

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <FaEyeSlash size={18} />
                    ) : (
                      <FaEye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading || !hydrated}
                className="h-11 w-full bg-green-600 font-semibold text-white hover:bg-green-700"
              >
                {loading
                  ? "Please wait..."
                  : isSignUp
                    ? "Create Account"
                    : "Sign In"}
              </Button>
            </form>

            {googleEnabled && <>
            {/* Divider */}
            <div className="my-7 flex items-center gap-4">
              <Separator className="flex-1" />
              <span className="text-xs text-slate-400">
                OR CONTINUE WITH
              </span>
              <Separator className="flex-1" />
            </div>

            {/* Google */}
            <Button
              type="button"
              variant="outline"
              disabled={loading || !hydrated}
              onClick={handleGoogleSignIn}
              className="h-11 w-full gap-3"
            >
              <FaGoogle />
              Continue with Google
            </Button>
            </>}

            {/* Switch between forms */}
            <p className="mt-7 text-center text-sm text-slate-500">
              {isSignUp
                ? "Already have an account?"
                : "Don't have an account?"}

              <Link
                href={isSignUp ? loginHref : registerHref}
                className="ml-2 font-semibold text-green-600 hover:underline"
              >
                {isSignUp ? "Sign In" : "Sign Up"}
              </Link>
            </p>

          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-slate-400">
          © {new Date().getFullYear()} StudioSpace
        </p>
      </div>
    </section>
  );
}
