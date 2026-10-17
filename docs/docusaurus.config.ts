import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

const REPOSITORY = "https://github.com/lukaeichten/SimulatorForSpectroscopicTerms";

/**
 * Path under which the whole site (simulator and documentation) is served. The simulator lives at
 * the path itself and the documentation at `<path>docs/`. GitHub Pages uses
 * `/SimulatorForSpectroscopicTerms/`, the Docker image `/`.
 */
const sitePath = normalizeBasePath(process.env.SITE_BASE_PATH ?? "/");

function normalizeBasePath(path: string): string {
  const trimmed = path.replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}/` : "/";
}

const config: Config = {
  title: "Simulator for spectroscopic terms",
  tagline: "User and developer documentation",
  favicon: "img/favicon.svg",

  url: process.env.SITE_URL ?? "https://lukaeichten.github.io",
  baseUrl: `${sitePath}docs/`,
  trailingSlash: true,

  onBrokenLinks: "throw",
  onBrokenAnchors: "throw",

  markdown: {
    // `.md` files are plain CommonMark, only `.mdx` files may contain JSX.
    format: "detect",
    mermaid: true,
    hooks: { onBrokenMarkdownLinks: "throw" },
  },
  themes: ["@docusaurus/theme-mermaid"],
  clientModules: [require.resolve("katex/dist/katex.min.css")],

  i18n: { defaultLocale: "en", locales: ["en"] },

  customFields: {
    /** URL of the simulator, used by the `AppLink` component. */
    appUrl: sitePath,
  },

  presets: [
    [
      "classic",
      {
        docs: {
          path: "content",
          routeBasePath: "/",
          sidebarPath: "./sidebars.ts",
          editUrl: `${REPOSITORY}/edit/main/docs/`,
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        blog: false,
        theme: { customCss: "./src/css/custom.css" },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [
    // Docusaurus's persistent webpack cache does not notice a changed base path and would reuse
    // CSS with asset URLs (e.g. the KaTeX fonts) of the previous path. A separate cache per base
    // path keeps builds for different paths apart.
    () => ({
      name: "cache-per-base-path",
      configureWebpack: (webpackConfig) => {
        const cache = webpackConfig.cache;
        if (typeof cache !== "object" || cache.type !== "filesystem") {
          return {};
        }
        const pathKey = sitePath.replace(/[^A-Za-z0-9]+/g, "_");
        return { cache: { ...cache, name: `${cache.name ?? "docusaurus"}-path${pathKey}` } };
      },
    }),
  ],

  themeConfig: {
    colorMode: { respectPrefersColorScheme: true },
    mermaid: { theme: { light: "neutral", dark: "dark" } },
    navbar: {
      title: "Simulator for spectroscopic terms",
      logo: { alt: "", src: "img/favicon.svg" },
      items: [
        { type: "docSidebar", sidebarId: "user", position: "left", label: "User guide" },
        { type: "docSidebar", sidebarId: "developer", position: "left", label: "Developer guide" },
        {
          // Raw HTML: Docusaurus would otherwise prefix the documentation's base URL.
          type: "html",
          value: `<a class="navbar__item navbar__link" href="${sitePath}">Open the simulator</a>`,
          position: "right",
        },
        { href: REPOSITORY, label: "GitHub", position: "right" },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Documentation",
          items: [
            { label: "User guide", to: "/user/introduction" },
            { label: "How the terms are derived", to: "/user/method" },
            { label: "Developer guide", to: "/developer/overview" },
          ],
        },
        {
          title: "Project",
          items: [
            { html: `<a class="footer__link-item" href="${sitePath}">Open the simulator</a>` },
            { label: "Source code", href: REPOSITORY },
            { label: "Report a problem", href: `${REPOSITORY}/issues` },
          ],
        },
      ],
      copyright: "MIT License",
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["rust", "toml", "bash", "json"],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
