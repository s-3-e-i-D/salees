import { createFileRoute } from "@tanstack/react-router";
import { SaleesApp } from "@/components/salees-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <SaleesApp />;
}
