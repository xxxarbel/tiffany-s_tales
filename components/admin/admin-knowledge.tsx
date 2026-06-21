"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";

import type { DocumentSummary } from "@/lib/voice/documents";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const UPLOAD_ACCEPT = ".txt,.md,.markdown,.pdf,.docx";

function formatUpdatedAt(value: string) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function AdminKnowledge() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [docs, setDocs] = useState<DocumentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function refreshDocs() {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      setDocs(Array.isArray(data.documents) ? data.documents : []);
    } catch {
      /* store unavailable — leave the list as-is */
    } finally {
      setLoading(false);
    }
  }

  // Load the list on mount. setState runs after the await, so it doesn't trip
  // the React 19 set-state-in-effect rule.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/documents");
        const data = await res.json();
        if (active) setDocs(Array.isArray(data.documents) ? data.documents : []);
      } catch {
        /* store unavailable — leave the list empty */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function onUploadFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-uploading the same file
    if (!file) return;

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Upload failed (${res.status}).`);
      }
      const chunks = data.document.chunks as number;
      toast.success(
        `Added “${data.document.title}” (${chunks} chunk${chunks === 1 ? "" : "s"}).`
      );
      await refreshDocs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(doc: DocumentSummary) {
    setDeletingId(doc.id);
    try {
      const res = await fetch(`/api/documents?id=${doc.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not delete that document.");
      }
      toast.success(`Removed “${doc.title}”.`);
      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setDeletingId(null);
    }
  }

  const totalChunks = docs.reduce((n, d) => n + d.chunks, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl">
          Voice guide knowledge
          <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-sm font-normal text-muted-foreground tabular-nums">
            {docs.length}
          </span>
        </CardTitle>
        <CardDescription>
          Upload <code>.txt</code>, <code>.md</code>, <code>.pdf</code>, or{" "}
          <code>.docx</code> files about the club. The voice guide answers
          members&apos; questions from these — re-uploading a file with the same
          name replaces it.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept={UPLOAD_ACCEPT}
            onChange={onUploadFile}
            className="hidden"
          />
          <Button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="h-10"
          >
            {uploading ? <Spinner /> : <Upload data-icon="inline-start" />}
            {uploading ? "Uploading…" : "Upload document"}
          </Button>
          {docs.length > 0 && (
            <span className="text-sm text-muted-foreground tabular-nums">
              {totalChunks} searchable chunk{totalChunks === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {loading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner /> Loading documents…
          </p>
        ) : docs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No documents yet. Upload one to ground the voice guide&apos;s answers.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden sm:table-cell">Chunks</TableHead>
                <TableHead className="hidden md:table-cell">Updated</TableHead>
                <TableHead className="w-12 text-right">Remove</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => (
                <TableRow key={doc.id}>
                  <TableCell className="font-medium">{doc.title}</TableCell>
                  <TableCell className="hidden sm:table-cell tabular-nums text-muted-foreground">
                    {doc.chunks}
                  </TableCell>
                  <TableCell className="hidden md:table-cell whitespace-nowrap text-xs text-muted-foreground">
                    {formatUpdatedAt(doc.updated_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${doc.title}`}
                      disabled={deletingId === doc.id}
                      onClick={() => onDelete(doc)}
                    >
                      {deletingId === doc.id ? (
                        <Spinner />
                      ) : (
                        <Trash2 className="text-muted-foreground" />
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
