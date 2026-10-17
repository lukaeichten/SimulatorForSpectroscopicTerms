import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import type { ReactNode } from "react";

interface AppLinkProps {
  /** Query string of the simulation run without `?`, e.g. `p=2&term=1`. */
  readonly query?: string;
  readonly children: ReactNode;
}

/** Links to the simulator, opening the run described by `query`. */
export default function AppLink({ query, children }: AppLinkProps): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  const appUrl = String(siteConfig.customFields?.["appUrl"] ?? "/");
  return <a href={query ? `${appUrl}?${query}` : appUrl}>{children}</a>;
}
