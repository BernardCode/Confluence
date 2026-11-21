import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ConfluenceMark } from "./ConfluenceMark";
import { Activity, HardHat, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SimBadge() {
  return (
    <span className="simulation-badge">
      <span />
      SIMULATED DATA
    </span>
  );
}

export function AppShell({
  children,
  role,
}: {
  children: ReactNode;
  role: "ops" | "crew";
}) {
  return (
    <div className="confluence-demo" data-role={role}>
      <header className="demo-header">
        <Link to="/" className="brand-lockup">
          <ConfluenceMark className="size-8" />
          <span>
            confluence<span className="brand-period">.</span>
          </span>
        </Link>
        <nav aria-label="Simulated role switch" className="demo-role-nav">
          <Button
            asChild
            variant="ghost"
            className={role === "ops" ? "role-active" : ""}
          >
            <Link to="/ops">
              <Activity />
              Operations
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            className={role === "crew" ? "role-active" : ""}
          >
            <Link to="/crew">
              <HardHat />
              Field crew
            </Link>
          </Button>
        </nav>
        <div className="demo-header-meta">
          <SimBadge />
          <Button
            asChild
            variant="ghost"
            size="icon"
            title="Back to Confluence"
          >
            <Link to="/">
              <ArrowUpRight />
            </Link>
          </Button>
        </div>
      </header>
      {children}
      <footer className="demo-footer">
        Simulated competition prototype. Roles are not secure sign-in, no real
        notices are sent and no equipment is controlled.
      </footer>
    </div>
  );
}
