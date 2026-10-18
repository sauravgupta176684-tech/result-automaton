import { createFileRoute } from "@tanstack/react-router";
import { Clock, User, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useExamStore, EXAM_LABELS } from "@/lib/exam-store";

export const Route = createFileRoute("/_app/audit")({
  head: () => ({ meta: [
    { title: "Audit Log — Smart Exam System" },
    { name: "description", content: "Review a chronological record of student mark changes." },
    { property: "og:title", content: "Audit Log — Smart Exam System" },
    { property: "og:description", content: "Review a chronological record of student mark changes." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AuditPage,
});

function AuditPage() {
  const audit = useExamStore((s) => s.audit);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-3xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Every marks edit is recorded — who, what, when (most recent 500)
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{audit.length} {audit.length === 1 ? "entry" : "entries"}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {audit.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No edits yet. Changes you make in Marks Entry will appear here.
            </div>
          ) : (
            <div className="divide-y">
              {audit.map((a, i) => (
                <div key={i} className="px-5 py-3 flex flex-wrap items-center gap-3 text-sm hover:bg-muted/30">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs min-w-[140px]">
                    <Clock className="size-3.5" />
                    {new Date(a.ts).toLocaleString()}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    <User className="size-3.5 text-muted-foreground" />
                    <span className="font-medium">{a.user}</span>
                  </div>
                  <Badge variant="outline" className="font-mono text-[10px]">{a.studentRoll}</Badge>
                  <Badge variant="secondary" className="text-[10px]">{EXAM_LABELS[a.exam]}</Badge>
                  <Badge variant="outline" className="text-[10px]">{a.subject}</Badge>
                  <div className="flex items-center gap-2 ml-auto tabular-nums">
                    <span className="text-muted-foreground line-through">{a.oldValue ?? "—"}</span>
                    <ArrowRight className="size-3 text-muted-foreground" />
                    <span className="font-bold text-primary">{a.newValue ?? "—"}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
