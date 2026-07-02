import type { ReactNode } from "react";
import { Card } from "@/components/ui/primitives";
import { Field, TextInput } from "@/components/ui/fields";
import { MutationForm } from "@/components/ui/MutationForm";
import { loginAction, signupAction } from "@/auth/actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string }>;
}): Promise<ReactNode> {
  const params = await searchParams;
  const next = params.next ?? "/";
  const signup = params.mode === "signup";

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "48px 16px", display: "grid", gap: 16 }}>
      <Card title={signup ? "Create your account" : "Sign in"}>
        {signup ? (
          <MutationForm
            action={signupAction}
            submitLabel="Create account"
            hidden={{ next }}
          >
            <Field label="Name">
              <TextInput name="name" required placeholder="Your name" />
            </Field>
            <Field label="Email">
              <TextInput name="email" type="email" required placeholder="you@example.com" />
            </Field>
            <Field label="Phone (optional)">
              <TextInput name="phone" type="tel" placeholder="555-123-4567" />
            </Field>
            <Field label="Password">
              <TextInput name="password" type="password" required placeholder="At least 8 characters" />
            </Field>
          </MutationForm>
        ) : (
          <MutationForm action={loginAction} submitLabel="Sign in" hidden={{ next }}>
            <Field label="Email">
              <TextInput name="email" type="email" required placeholder="you@example.com" />
            </Field>
            <Field label="Password">
              <TextInput name="password" type="password" required />
            </Field>
          </MutationForm>
        )}
      </Card>
      <p style={{ margin: 0, textAlign: "center", fontSize: 13, color: "var(--muted)" }}>
        {signup ? (
          <>
            Already have an account?{" "}
            <a href={`/login?next=${encodeURIComponent(next)}`}>Sign in</a>
          </>
        ) : (
          <>
            New here?{" "}
            <a href={`/login?mode=signup&next=${encodeURIComponent(next)}`}>
              Create an account
            </a>
          </>
        )}
      </p>
    </main>
  );
}
