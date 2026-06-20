import Image from "next/image";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata = {
  title: "Reset password · Tiffany's Tales",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

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
            Choose a new password
          </CardTitle>
          <CardDescription>
            Pick a new password for your account below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm token={token} error={error} />
        </CardContent>
      </Card>
    </main>
  );
}
