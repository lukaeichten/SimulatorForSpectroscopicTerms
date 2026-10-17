// Starts the simulator and the documentation dev servers together. The simulator's dev server
// forwards /docs to the documentation dev server, so both are needed for the Documentation link.
// Stopping one server (or pressing Ctrl+C) stops the other.
import { spawn } from "node:child_process";

const servers = [
  ["npm", ["run", "start", "--workspace", "docs"]],
  ["npm", ["run", "dev", "--workspace", "web"]],
];

const children = servers.map(([command, args]) =>
  spawn(command, args, { stdio: "inherit", shell: process.platform === "win32" }),
);

let stopping = false;
function stopAll(exitCode) {
  if (stopping) {
    return;
  }
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null) {
      child.kill("SIGTERM");
    }
  }
  process.exitCode = exitCode;
}

for (const child of children) {
  child.on("exit", (code) => stopAll(code ?? 0));
  child.on("error", (error) => {
    console.error(error);
    stopAll(1);
  });
}
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stopAll(0));
}
