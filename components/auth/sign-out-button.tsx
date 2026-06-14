"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    setLoading(true)
    await authClient.signOut()
    router.push("/")
    router.refresh()
  }

  return (
    <Button variant="outline" size="sm" onClick={handleSignOut} disabled={loading}>
      <LogOut data-icon="inline-start" />
      Sign out
    </Button>
  )
}
