import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Smart Exam Result Management System" },
    { name: "description", content: "Manage college examination marks and results for Mid Sem and PUT." },
    { property: "og:title", content: "Smart Exam Result Management System" },
    { property: "og:description", content: "Manage college examination marks and results for Mid Sem and PUT." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
  component: () => null,
});
