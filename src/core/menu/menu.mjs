/**
 * notion-enhancer
 * (c) 2023 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

import { checkForUpdate, isDevelopmentBuild } from "../updateCheck.mjs";
import { Sidebar } from "./islands/Sidebar.mjs";
import { Footer } from "./islands/Footer.mjs";
import { Banner } from "./islands/Banner.mjs";
import { Onboarding } from "./islands/Onboarding.mjs";
import { Telemetry } from "./islands/Telemetry.mjs";
import { View } from "./islands/View.mjs";
import { List } from "./islands/List.mjs";
import { Mod } from "./islands/Mod.mjs";
import { Options } from "./islands/Options.mjs";
import { Profiles } from "./islands/Profiles.mjs";

let _apiImported = false,
  _renderStarted = false,
  _stateHookedInto = false,
  _hotkeyRegistered = false;

const categories = [
    {
      icon: "palette",
      id: "themes",
      title: "Themes",
      description: `Themes override Notion's colour schemes. Dark themes require
        Notion to be in dark mode and light themes require Notion to be in light
        mode. To switch between dark mode and light mode, go to <mark>Settings &
        members → My notifications & settings → My settings → Appearance</mark>.`,
    },
    {
      icon: "zap",
      id: "extensions",
      title: "Extensions",
      description: `Extensions add to the functionality and layout of the Notion
        client, interacting with and modifying existing interfaces.`,
    },
    {
      icon: "plug",
      id: "integrations",
      title: "Integrations",
      description: `<span class="text-[color:var(--theme--fg-red)]">
        Integrations access and modify Notion content. They interact directly with
        <mark>https://www.notion.so/api/v3</mark>. Use at your own risk.</span>`,
    },
  ],
  sidebar = [
    "notion-enhancer",
    {
      id: "welcome",
      title: "Welcome",
      icon: "notion-enhancer",
    },
    {
      icon: "message-circle",
      title: "Community",
      href: "https://discord.gg/sFWPXtA",
    },
    {
      icon: "clock",
      title: "Changelog",
      href: "https://notion-enhancer.github.io/about/changelog/",
    },
    {
      icon: "book",
      title: "Documentation",
      href: "https://notion-enhancer.github.io/",
    },
    {
      icon: "github",
      title: "Source Code",
      href: "https://github.com/notion-enhancer",
    },
    "Settings",
    {
      id: "core",
      title: "Core",
      icon: "sliders-horizontal",
      disableUntilAgreedToTerms: true,
    },
    ...categories.map((c) => ({
      id: c.id,
      title: c.title,
      icon: c.icon,
      disableUntilAgreedToTerms: true,
    })),
  ];

const renderMenu = async () => {
    const { html, ...api } = globalThis.__enhancerApi,
      [theme, icon] = api.useState(["theme", "icon"]);
    if (!theme || !icon || _renderStarted) return;
    if (icon === "Monochrome") sidebar[1].icon += "?mask";
    _renderStarted = true;

    const mods = await api.getMods();
    for (let i = 0; i < categories.length; i++) {
      const { id } = categories[i];
      categories[i].mods = mods.filter(({ _src }) => _src.startsWith(`${id}/`));
      categories[i].view = html`<${View} id=${id}>
        <${List} ...${categories[i]} />
      <//>`;
    }
    for (let i = 0; i < mods.length; i++) {
      const options = mods[i].options?.filter((opt) => opt.type !== "heading");
      if (mods[i]._src === "core" || !options?.length) continue;
      const _get = () => api.isEnabled(mods[i].id),
        _set = async (enabled) => {
          await api.setEnabled(mods[i].id, enabled);
          api.setState({ rerender: true });
        };
      mods[i].view = html`<${View} id=${mods[i].id}>
        <!-- passing an empty options array hides the settings button -->
        <${Mod} ...${{ ...mods[i], options: [], _get, _set }} />
        <${Options} mod=${mods[i]} />
      <//>`;
    }

    const $sidebar = html`<${Sidebar}
        items=${sidebar}
        categories=${categories}
      />`,
      $main = html`
        <main class="flex-(& col) overflow-hidden transition-[height]">
          <!-- wrappers necessary for transitions and breakpoints -->
          <div class="grow overflow-auto">
            <div class="relative h-full w-full">
              <${View} id="welcome">
                <${Banner}
                  updateAvailable=${await checkForUpdate()}
                  isDevelopmentBuild=${await isDevelopmentBuild()}
                />
                <${Onboarding} />
              <//>
              <${View} id="core">
                <${Options} mod=${mods.find(({ _src }) => _src === "core")} />
                <${Telemetry} />
                <${Profiles} />
              <//>
              ${[...categories, ...mods]
                .filter(({ view }) => view)
                .map(({ view }) => view)}
            </div>
          </div>
          <${Footer} categories=${categories} />
        </main>
      `;
    api.useState(["footerOpen"], ([footerOpen]) => {
      $main.style.height = footerOpen ? "100%" : "calc(100% + 33px)";
    });
    api.useState(["transitionInProgress"], ([transitionInProgress]) => {
      $main.children[0].style.overflow = transitionInProgress ? "hidden" : "";
    });

    const $skeleton = document.querySelector("#skeleton");
    $skeleton.replaceWith($sidebar, $main);
  },
  registerHotkey = ([hotkey]) => {
    const api = globalThis.__enhancerApi;
    if (!hotkey || _hotkeyRegistered) return;
    _hotkeyRegistered = true;
    api.addKeyListener(hotkey, (event) => {
      event.preventDefault();
      const msg = { channel: "notion-enhancer", action: "open-menu" };
      parent?.postMessage(msg, "*");
    });
    api.addKeyListener("Escape", () => {
      const [popupOpen] = api.useState(["popupOpen"]);
      if (!popupOpen) {
        const msg = { channel: "notion-enhancer", action: "close-menu" };
        parent?.postMessage(msg, "*");
      } else api.setState({ rerender: true });
    });
  },
  updateTheme = ([theme]) => {
    if (theme === "dark") document.body.classList.add("dark");
    if (theme === "light") document.body.classList.remove("dark");
  };

const importApi = async () => {
    if (_apiImported) return;
    _apiImported = true;
    const api = globalThis.__enhancerApi;
    if (typeof api === "undefined") await import("../../shared/system.js");
    await import("../../load.mjs").then((i) => i.default);
  },
  hookIntoState = () => {
    if (_stateHookedInto) return;
    _stateHookedInto = true;
    const api = globalThis.__enhancerApi;
    api.useState(["rerender"], renderMenu);
    api.useState(["hotkey"], registerHotkey);
    api.useState(["theme"], updateTheme);
  };

window.addEventListener("focus", async () => {
  await importApi().then(hookIntoState);
  const api = globalThis.__enhancerApi;
  api.setState({ focus: true, rerender: true });
});
window.addEventListener("message", async (event) => {
  if (event.data?.channel !== "notion-enhancer") return;
  await importApi().then(hookIntoState);
  const api = globalThis.__enhancerApi;
  api.setState({
    rerender: true,
    hotkey: event.data?.hotkey ?? api.useState(["hotkey"]),
    theme: event.data?.theme ?? api.useState(["theme"]),
    icon: event.data?.icon ?? api.useState(["icon"]),
  });
});
