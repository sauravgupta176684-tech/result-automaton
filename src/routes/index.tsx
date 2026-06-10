import { createFileRoute, redirect } from "@tanstack/react-router";
import { auth } from "@/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window !== "undefined") {
      throw redirect({ to: auth.get() ? "/dashboard" : "/auth" });
    }
  },
  component: () => null,
});
