import { SignUp } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <SignUp
        routing="hash"
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-white dark:bg-zinc-900 shadow-lg rounded-xl",
            headerTitle: "text-zinc-900 dark:text-zinc-50",
            headerSubtitle: "text-zinc-600 dark:text-zinc-400",
            socialButtonsBlockButton: "border-zinc-300 dark:border-zinc-700",
            socialButtonsBlockButtonText: "text-zinc-900 dark:text-zinc-50",
            formFieldLabel: "text-zinc-700 dark:text-zinc-300",
            formFieldInput:
              "border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50",
            footerActionLink:
              "text-emerald-600 hover:text-emerald-700 dark:text-emerald-500 dark:hover:text-emerald-400",
            primaryButton:
              "bg-emerald-600 hover:bg-emerald-700 text-white",
          },
        }}
        forceRedirectUrl="/onboarding"
      />
    </div>
  );
}
