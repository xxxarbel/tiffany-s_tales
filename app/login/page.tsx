import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { auth } from "@/lib/auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-gradient-to-br from-primary to-plum px-6 py-12">
      <Link
        href="/"
        className="mb-6 flex items-center gap-2.5 text-cream transition-opacity hover:opacity-90"
      >
        <Image
          src="/logo.jpg"
          alt="Tiffany's Tales logo"
          width={44}
          height={44}
          className="rounded-full ring-2 ring-cream/30"
        />
        <span className="font-display text-xl font-bold">
          Tiffany&apos;s Tales
        </span>
      </Link>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">
            Join the pack
          </CardTitle>
          <CardDescription>
            Log in to your account or subscribe to become a member.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signup" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="signup">Subscribe</TabsTrigger>
              <TabsTrigger value="login">Log in</TabsTrigger>
            </TabsList>
            <TabsContent value="signup" className="pt-6">
              <SignupForm />
            </TabsContent>
            <TabsContent value="login" className="pt-6">
              <LoginForm />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <p className="mt-6 max-w-sm text-center text-sm text-cream/70">
        Membership is just £10 a month — books, monthly meet-ups and a
        wonderful community of readers.
      </p>
    </main>
  );
}
