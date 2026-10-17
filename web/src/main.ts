import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";

import { App } from "./app";
import { SimulatorService } from "./simulation/simulator-service";
import { byId } from "./ui/dom";
import { trackStickyOffset } from "./ui/layout";
import { ThemeManager } from "./ui/theme";
import { NoticesView } from "./ui/views/notices-view";
import { ThemeSwitch } from "./ui/views/theme-switch";

function setUpTheme(): void {
  const themeSwitch = new ThemeSwitch(byId("theme-switch", HTMLElement), (preference) => {
    theme.preference = preference;
  });
  const theme = new ThemeManager((preference) => themeSwitch.render(preference));
  themeSwitch.render(theme.preference);
}

async function main(): Promise<void> {
  setUpTheme();
  trackStickyOffset(byId("toolbar", HTMLElement));
  const loading = byId("loading", HTMLElement);
  try {
    const service = await SimulatorService.load();
    new App(service).start();
  } catch (error) {
    console.error(error);
    new NoticesView(byId("notices", HTMLElement)).render([
      {
        level: "danger",
        text: "The simulator could not be loaded. Does your browser support WebAssembly?",
      },
    ]);
  } finally {
    loading.hidden = true;
  }
}

void main();
