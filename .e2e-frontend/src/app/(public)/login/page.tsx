import AuthForm from "@/components/auth/AuthForm";

export default function LoginPage() {
  return <AuthForm mode="signin" googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} />;
}