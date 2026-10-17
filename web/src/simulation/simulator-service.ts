/**
 * Facade over the WebAssembly simulator. The rest of the frontend only talks to this module, so
 * the wasm bindings (memory management, typed arrays, …) stay in one place.
 */
import init, {
  Simulator,
  subshellKinds,
  type MicrostateInfo,
  type MicrostatePage,
  type Occupancy,
  type SubshellKindInfo,
  type Summary,
  type TermInfo,
} from "@wasm/simulator_wasm";

export type { MicrostateInfo, MicrostatePage, Occupancy, SubshellKindInfo, Summary, TermInfo };

/** The results of one electron configuration. */
export class SimulationRun {
  readonly summary: Summary;
  readonly terms: readonly TermInfo[];

  constructor(private readonly simulator: Simulator) {
    this.summary = simulator.summary();
    this.terms = simulator.terms();
  }

  /**
   * Returns one page of configurations (microstates).
   *
   * @param termIndices zero-based indices of the terms used as filter; empty lists everything
   * @param pageIndex zero-based page index; pages beyond the end yield the last page
   * @param pageSize number of configurations per page
   */
  microstatePage(
    termIndices: readonly number[],
    pageIndex: number,
    pageSize: number,
  ): MicrostatePage {
    return this.simulator.microstatePage(Uint32Array.from(termIndices), pageIndex, pageSize);
  }

  /** Releases the memory held by the WebAssembly module. */
  dispose(): void {
    this.simulator.free();
  }
}

/** Creates simulation runs and keeps the most recent one to avoid recomputation. */
export class SimulatorService {
  readonly subshellKinds: readonly SubshellKindInfo[];
  private current: { key: string; run: SimulationRun } | undefined;

  /** Loads the WebAssembly module and creates the service. */
  static async load(): Promise<SimulatorService> {
    await init();
    return new SimulatorService();
  }

  /** Creates the service; the WebAssembly module must already be initialized. */
  constructor() {
    this.subshellKinds = subshellKinds();
  }

  /**
   * Simulates the configuration with the given electron counts (ordered like
   * {@link subshellKinds}).
   *
   * @throws Error if a count exceeds the capacity of its subshell
   */
  simulate(electrons: readonly number[]): SimulationRun {
    const key = electrons.join(",");
    if (this.current?.key !== key) {
      const run = new SimulationRun(new Simulator(Uint32Array.from(electrons)));
      this.current?.run.dispose();
      this.current = { key, run };
    }
    return this.current.run;
  }
}
