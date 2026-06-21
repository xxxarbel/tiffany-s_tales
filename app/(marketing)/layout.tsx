import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VoiceAgentProvider } from "@/components/voice-agent/VoiceAgentProvider";
import { BookClubLauncher } from "@/components/voice-agent/BookClubLauncher";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VoiceAgentProvider>
      <div className="flex min-h-svh flex-col font-sans text-foreground">
        <SiteHeader />
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </div>
      {/* Site-wide floating voice guide on all public pages. */}
      <BookClubLauncher />
    </VoiceAgentProvider>
  );
}
