import { SignUp } from "@clerk/nextjs";
import { AuthFrame } from "../_components/AuthFrame";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <AuthFrame
      eyebrow="NutriMind Reserve · New account"
      title="Open a calorie reserve."
      description="Create a private nutrition ledger, establish a daily allowance, and carry deliberate choices forward instead of starting over each morning."
    >
      <SignUp
        routing="hash"
        appearance={{
          variables: {
            colorPrimary: "#9A7B23",
            colorBackground: "#FBF8F0",
            colorForeground: "#17140D",
            colorMutedForeground: "#6C6349",
            colorInput: "#FBF8F0",
            colorInputForeground: "#17140D",
            colorDanger: "#97271F",
            colorNeutral: "#17140D",
            borderRadius: "0.25rem",
            fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          },
          elements: {
            rootBox: "mx-auto",
            card: "surface",
            headerTitle: "font-bold tracking-[-0.02em] text-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton: "border-border",
            socialButtonsBlockButtonText: "text-foreground",
            formFieldLabel: "smallcaps text-foreground",
            formFieldInput: "border-input bg-card text-foreground rounded-[0.25rem]",
            footerActionLink: "text-[var(--brass-ink)] hover:text-foreground",
            formButtonPrimary: "btn-primary",
          },
        }}
        forceRedirectUrl="/onboarding"
      />
    </AuthFrame>
  );
}
