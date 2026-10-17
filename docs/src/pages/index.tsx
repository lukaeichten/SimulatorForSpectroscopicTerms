import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import type { ReactNode } from "react";

interface Guide {
  readonly title: string;
  readonly audience: string;
  readonly description: string;
  readonly to: string;
  readonly variant: "user" | "developer";
}

const GUIDES: readonly Guide[] = [
  {
    title: "User guide",
    audience: "For students, teachers and assistants",
    description:
      "How to enter an electron configuration, read the results, filter configurations, share runs and how the term symbols are derived.",
    to: "/user/introduction",
    variant: "user",
  },
  {
    title: "Developer guide",
    audience: "For contributors",
    description:
      "Architecture, the Rust crates and the web frontend, testing, deployment and the decisions behind them.",
    to: "/developer/overview",
    variant: "developer",
  },
];

export default function Home(): ReactNode {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout description={siteConfig.tagline}>
      <header className="hero hero--app">
        <div className="container">
          <h1 className="hero__title">{siteConfig.title}</h1>
          <p className="hero__subtitle">{siteConfig.tagline}</p>
        </div>
      </header>
      <main className="container margin-vert--xl">
        <div className="guide-cards">
          {GUIDES.map((guide) => (
            <Link key={guide.to} to={guide.to} className="card-link">
              <article className={`card shadow--md guide-card guide-card--${guide.variant}`}>
                <div className="card__header">
                  <h2 className="margin-bottom--xs">{guide.title}</h2>
                  <small>{guide.audience}</small>
                </div>
                <div className="card__body">
                  <p>{guide.description}</p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </main>
    </Layout>
  );
}
