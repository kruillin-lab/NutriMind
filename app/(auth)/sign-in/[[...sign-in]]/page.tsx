import { SignIn } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
        fallback={
          <div className="surface px-5 py-4 text-sm font-medium text-foreground">
            Loading sign in...
          </div>
        }
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
      />
    </div>
  );
}
