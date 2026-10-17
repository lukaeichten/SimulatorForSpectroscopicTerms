import { PAGE_SIZE } from "./config";
import {
  defaultQuery,
  formatQuery,
  parseQuery,
  restrictTerms,
  toggleTerm,
  type SimulationQuery,
} from "./simulation/query";
import type { SimulatorService } from "./simulation/simulator-service";
import { byId } from "./ui/dom";
import { termText } from "./ui/format";
import { ConfigurationForm } from "./ui/views/configuration-form";
import { ConfigurationsView } from "./ui/views/configurations-view";
import { NoticesView, type Notice } from "./ui/views/notices-view";
import { PossibilitiesView } from "./ui/views/possibilities-view";
import { TermsView } from "./ui/views/terms-view";

/** How a rendered query is recorded in the browser history. */
type HistoryMode = "push" | "replace";

/**
 * Connects the URL, the simulator and the views.
 *
 * The query string is the single source of truth: every user action produces a new
 * {@link SimulationQuery}, which is rendered and written to the URL. This makes every state
 * shareable by link and lets the browser's back and forward buttons work.
 */
export class App {
  private readonly form: ConfigurationForm;
  private readonly possibilities: PossibilitiesView;
  private readonly terms: TermsView;
  private readonly configurations: ConfigurationsView;
  private readonly notices: NoticesView;
  private query: SimulationQuery;

  constructor(private readonly service: SimulatorService) {
    const kinds = service.subshellKinds;
    this.query = defaultQuery(kinds);

    this.form = new ConfigurationForm(byId("configuration-form", HTMLFormElement), kinds, {
      onSimulate: (electrons) => this.navigate({ electrons, terms: [], page: 1 }),
      onShare: () => this.copyLink(),
    });
    this.possibilities = new PossibilitiesView(byId("possibilities-body", HTMLTableSectionElement));
    this.terms = new TermsView(
      byId("terms-body", HTMLTableSectionElement),
      byId("terms-clear", HTMLButtonElement),
      {
        onToggle: (term) => this.navigate(toggleTerm(this.query, term)),
        onClear: () => this.navigate({ ...this.query, terms: [], page: 1 }),
      },
    );
    this.configurations = new ConfigurationsView(
      {
        head: byId("configurations-head", HTMLTableSectionElement),
        body: byId("configurations-body", HTMLTableSectionElement),
        summary: byId("configurations-summary", HTMLElement),
        scroller: byId("configurations-scroller", HTMLElement),
        paginationTop: byId("pagination-top", HTMLElement),
        paginationBottom: byId("pagination-bottom", HTMLElement),
      },
      kinds,
      (page) => this.navigate({ ...this.query, page }),
    );
    this.notices = new NoticesView(byId("notices", HTMLElement));

    window.addEventListener("popstate", () => this.renderLocation());
  }

  /** Renders the simulation described by the current URL. */
  start(): void {
    this.renderLocation();
  }

  private renderLocation(): void {
    const { query, problems } = parseQuery(window.location.search, this.service.subshellKinds);
    this.render(query, problems, "replace");
  }

  private navigate(query: SimulationQuery): void {
    this.render(query, [], "push");
  }

  private render(requested: SimulationQuery, problems: readonly string[], mode: HistoryMode): void {
    const notices: Notice[] = problems.map((text) => ({ level: "warning", text }));

    let run;
    try {
      run = this.service.simulate(requested.electrons);
    } catch (error) {
      notices.push({
        level: "danger",
        text: error instanceof Error ? error.message : String(error),
      });
      this.notices.render(notices);
      return;
    }

    const restricted = restrictTerms(requested, run.terms.length);
    notices.push(...restricted.problems.map((text): Notice => ({ level: "warning", text })));
    const selected = restricted.query.terms;
    const page = run.microstatePage(
      selected.map((term) => term - 1),
      restricted.query.page - 1,
      PAGE_SIZE,
    );
    if (page.pageIndex + 1 < restricted.query.page) {
      notices.push({
        level: "warning",
        text: `Page ${restricted.query.page} does not exist; showing the last page instead.`,
      });
    }

    this.query = { ...restricted.query, page: page.pageIndex + 1 };
    this.writeUrl(mode);

    this.notices.render(notices);
    this.form.setElectrons(this.query.electrons);
    this.possibilities.render(run.summary);
    this.terms.render(run.terms, selected);
    this.configurations.render(
      page,
      selected.flatMap((term) => {
        const info = run.terms[term - 1];
        return info ? [termText(info)] : [];
      }),
    );
    document.title = `${this.configurationName()} – Simulator for spectroscopic terms`;
  }

  private configurationName(): string {
    const parts = this.service.subshellKinds
      .map((kind, index) => ({ symbol: kind.symbol, electrons: this.query.electrons[index] ?? 0 }))
      .filter(({ electrons }) => electrons > 0)
      .map(({ symbol, electrons }) => `${symbol}${electrons}`);
    return parts.length > 0 ? parts.join(" ") : "Empty configuration";
  }

  private writeUrl(mode: HistoryMode): void {
    const search = formatQuery(this.query, this.service.subshellKinds);
    const url = `${window.location.pathname}${search ? `?${search}` : ""}${window.location.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (url === current) {
      return;
    }
    if (mode === "push") {
      window.history.pushState(null, "", url);
    } else {
      window.history.replaceState(null, "", url);
    }
  }

  private async copyLink(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      return true;
    } catch {
      return false;
    }
  }
}
