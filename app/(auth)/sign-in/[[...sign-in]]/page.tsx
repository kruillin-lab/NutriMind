import { SignIn } from "@clerk/nextjs";

export const dynamic = "force-dynamic";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FFF8E7] px-4 py-16 dark:bg-[#18120E]">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
        fallback={
          <div className="rounded-xl border-2 border-[#18120E] bg-white px-5 py-4 text-sm font-medium text-[#18120E] shadow-[6px_6px_0_#DFFF35] dark:border-[#FFF8E7] dark:bg-[#241A13] dark:text-[#FFF8E7]">
            Loading sign in...
          </div>
        }
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "rounded-xl border-2 border-[#18120E] bg-white shadow-[8px_8px_0_#DFFF35] dark:border-[#FFF8E7] dark:bg-[#241A13]",
            headerTitle: "text-[#18120E] dark:text-[#FFF8E7]",
            headerSubtitle: "text-[#5B4A3D] dark:text-[#FFF8E7]/70",
            socialButtonsBlockButton: "border-[#18120E]/20 dark:border-[#FFF8E7]/20",
            socialButtonsBlockButtonText: "text-[#18120E] dark:text-[#FFF8E7]",
            formFieldLabel: "text-[#18120E] dark:text-[#FFF8E7]",
            formFieldInput:
              "border-[#18120E]/25 bg-white text-[#18120E] dark:border-[#FFF8E7]/20 dark:bg-[#18120E] dark:text-[#FFF8E7]",
            footerActionLink: "text-[#007E8A] hover:text-[#005E67] dark:text-[#00C8FF]",
            primaryButton: "bg-[#18120E] text-[#DFFF35] hover:bg-[#2A211A] dark:bg-[#DFFF35] dark:text-[#18120E]",
          },
        }}
      />
    </div>
  );
}
