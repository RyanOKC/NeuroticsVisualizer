import { Link } from "@tanstack/react-router";
import { AudioLines, Image } from "lucide-react";

export function AppTabs({ current }: { current: "listen" | "stills" }) {
  return (
    <nav className="tabbar" aria-label="Studio">
      <Link to="/" className={tab(current === "listen")} aria-current={current === "listen" ? "page" : undefined}>
        <AudioLines className="size-5" aria-hidden="true" />
        Listen
      </Link>
      <Link to="/stills" className={tab(current === "stills")} aria-current={current === "stills" ? "page" : undefined}>
        <Image className="size-5" aria-hidden="true" />
        Stills
      </Link>
    </nav>
  );
}

function tab(active: boolean) {
  return `flex h-14 flex-1 flex-col items-center justify-center gap-1 text-xs ${
    active ? "text-copper" : "text-muted"
  }`;
}
