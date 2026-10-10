import { createFileRoute } from "@tanstack/react-router";
import { Visualizer } from "@/components/visualizer";

export const Route = createFileRoute("/")({ component: Visualizer });
