import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Torvan Medical CleanStation
          </h1>
          <p className="text-gray-600">
            Sign in to your account
          </p>
        </div>
        <SignIn 
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-up"
          redirectUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-lg border-0",
            }
          }}
        />
      </div>
    </div>
  );
}