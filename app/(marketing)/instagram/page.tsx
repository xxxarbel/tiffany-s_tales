import { getPublicInstagramPosts } from "@/lib/instagram";
import { Card } from "@/components/ui/card";
import { InstagramPostCard } from "@/components/instagram-post-card";
import { InstagramIcon } from "@/components/icons/instagram-icon";

export const metadata = {
  title: "Instagram · Tiffany's Tales",
};

export default async function InstagramPage() {
  const posts = await getPublicInstagramPosts();

  return (
    <section className="mx-auto max-w-6xl px-6 py-20">
      <div className="mb-14 text-center">
        <p className="mb-2 text-sm font-semibold tracking-[0.15em] text-primary uppercase">
          From Instagram
        </p>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          @tiffanystales
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Riette&apos;s latest book reviews and reads, straight from her
          Instagram.
        </p>
        <a
          href="https://www.instagram.com/tiffanystales/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          <InstagramIcon className="size-4" />
          Follow @tiffanystales
        </a>
      </div>

      {posts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {posts.map((post) => (
            <InstagramPostCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <Card className="mx-auto max-w-md items-center gap-2 bg-secondary p-10 text-center text-secondary-foreground">
          <InstagramIcon className="size-7 text-primary" />
          <p className="font-display text-lg font-semibold">
            Posts are on their way
          </p>
          <p className="text-sm text-muted-foreground">
            Riette&apos;s Instagram reviews will appear here soon. Check back
            shortly!
          </p>
        </Card>
      )}
    </section>
  );
}
