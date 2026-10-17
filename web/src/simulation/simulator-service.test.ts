// Integration test of the WebAssembly bindings. Requires the wasm package (`npm run wasm:dev`).
import { readFileSync } from "node:fs";

import { initSync } from "@wasm/simulator_wasm";
import { beforeAll, describe, expect, it } from "vitest";

import { SimulatorService } from "./simulator-service";

beforeAll(() => {
  const wasm = new URL("../../../crates/wasm/pkg/simulator_wasm_bg.wasm", import.meta.url);
  initSync({ module: readFileSync(wasm) });
});

describe("SimulatorService", () => {
  it("lists the subshell kinds", () => {
    const service = new SimulatorService();
    expect(service.subshellKinds.map((kind) => kind.symbol)).toEqual(["s", "p", "d", "f"]);
    expect(service.subshellKinds[2]).toEqual({
      symbol: "d",
      azimuthal: 2,
      capacity: 10,
      magneticNumbers: [-2, -1, 0, 1, 2],
    });
  });

  it("derives the terms of p2", () => {
    const run = new SimulatorService().simulate([0, 2, 0, 0]);
    expect(run.summary.microstates).toBe(15);
    expect(run.terms.map((term) => `${term.multiplicity}${term.letter}`)).toEqual([
      "3P",
      "1D",
      "1S",
    ]);
    expect(run.terms[0]).toMatchObject({ orbital: 1, spin: 1, totalAngularMomenta: [0, 1, 2] });
  });

  it("pages and filters the configurations", () => {
    const run = new SimulatorService().simulate([0, 3, 0, 0]);
    const page = run.microstatePage([0], 1, 2);
    expect(page).toMatchObject({ pageIndex: 1, pageSize: 2, totalItems: 8, pageCount: 4 });
    expect(page.items.map((item) => item.position)).toEqual([3, 4]);
    expect(page.items.every((item) => item.ml === 0)).toBe(true);
    expect(page.items[0]?.subshells[1]).toHaveLength(3);
  });

  it("reuses the last run and rejects invalid configurations", () => {
    const service = new SimulatorService();
    expect(service.simulate([0, 1, 0, 0])).toBe(service.simulate([0, 1, 0, 0]));
    expect(() => service.simulate([3, 0, 0, 0])).toThrow(/at most 2/);
  });
});
