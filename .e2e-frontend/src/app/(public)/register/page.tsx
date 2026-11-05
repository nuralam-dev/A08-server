import AuthForm from "@/components/auth/AuthForm";

export default function RegisterPage() {
  return <AuthForm mode="signup" googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} />;
}