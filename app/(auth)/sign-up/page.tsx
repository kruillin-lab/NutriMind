import { SignUp } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <SignUp
        routing="hash"
        appearance={{
          variables: {
            colorPrimary: "#C96442",
          },
          elements: {
            rootBox: "mx-auto",
            card: "surface",
            headerTitle: "font-serif text-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton: "border-border",
            socialButtonsBlockButtonText: "text-foreground",
            formFieldLabel: "text-foreground",
            formFieldInput: "border-input bg-card text-foreground",
            footerActionLink: "text-primary hover:text-primary/80",
            primaryButton: "bg-primary text-primary-foreground hover:bg-primary/90",
          },
        }}
        forceRedirectUrl="/onboarding"
      />
    </div>
  );
}
