import { Card, CardContent } from "@/components/ui/card";
import { ContactForm } from "@/components/contact-form";

export const metadata = {
  title: "Contact · Tiffany's Tales",
};

export default function ContactPage() {
  return (
    <section className="bg-muted/50 py-20">
      <div className="mx-auto max-w-2xl px-6">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold tracking-[0.15em] text-primary uppercase">
            Get in touch
          </p>
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Contact us
          </h1>
          <p className="mt-3 text-muted-foreground">
            Have a question or want to join our in-person book club? Feel free
            to reach out using the form below!
          </p>
        </div>
        <Card className="p-2">
          <CardContent className="p-6">
            <ContactForm />
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
