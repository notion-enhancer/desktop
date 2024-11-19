/**
 * notion-enhancer
 * (c) 2023 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

// telemetry endpoint not ready, disabled for current release

import { checkForUpdate } from "./updateCheck.mjs";
// import { sendTelemetryPing } from "./sendTelemetry.mjs";
import { Modal, Frame } from "./islands/Modal.mjs";
import { MenuButton } from "./islands/MenuButton.mjs";
import { Tooltip } from "./islands/Tooltip.mjs";
import { Panel } from "./islands/Panel.mjs";

const shouldLoadThemeOverrides = async (api, db) => {
    const { getMods, isEnabled } = api,
      loadThemeOverrides = await db.get("loadThemeOverrides");
    if (loadThemeOverrides === "Enabled") return true;
    if (loadThemeOverrides === "Disabled") return false;
    // prettier-ignore
    // loadThemeOverrides === "Auto"
    return (await getMods(async (mod) => {
      if (!mod._src.startsWith("themes/")) return false;
      return await isEnabled(mod.id);
    })).length;
  },
  loadThemeOverrides = async (api, db) => {
    const { html, enhancerUrl } = api;
    if (!(await shouldLoadThemeOverrides(api, db))) return;
    document.head.append(html`<link
      rel="stylesheet"
      href=${enhancerUrl("core/theme.css")}
    />`);
  },
  insertCustomStyles = async (api, db) => {
    const { html } = api,
      customStyles = (await db.get("customStyles"))?.content;
    if (!customStyles) return;
    return document.head.append(html`<style>
      ${customStyles}
    </style>`);
  };

const insertMenu = async (api, db) => {
  const inviteMember = `.notion-sidebar-container .notion-sidebar [role="button"]:has(.inviteMember)`,
    { html, addMutationListener, removeMutationListener } = api,
    { addKeyListener, platform, enhancerUrl, onMessage } = api,
    menuButtonIconStyle = await db.get("menuButtonIconStyle"),
    menuButtonLabel = await db.get("menuButtonLabel"),
    openMenuHotkey = await db.get("openMenuHotkey"),
    menuPing = {
      channel: "notion-enhancer",
      hotkey: openMenuHotkey,
      icon: menuButtonIconStyle,
    };

  let _contentWindow;
  const updateMenuTheme = () => {
    const darkMode = document.body.classList.contains("dark"),
      notionTheme = darkMode ? "dark" : "light";
    menuPing.theme = notionTheme;
    _contentWindow?.postMessage?.(menuPing, "*");
  };

  const $modal = html`<${Modal}>
      <${Frame}
        title="notion-enhancer menu"
        src="${enhancerUrl("core/menu/index.html")}"
        onload=${function () {
          // pass notion-enhancer api to electron menu process
          if (["linux", "win32", "darwin"].includes(platform)) {
            const apiKey = "__enhancerApi";
            this.contentWindow[apiKey] = { ...globalThis[apiKey] };
          }
          _contentWindow = this.contentWindow;
          updateMenuTheme();
        }}
      />
    <//>`,
    $button = html`<${MenuButton}
      onclick=${$modal.open}
      notifications=${(await checkForUpdate()) ? 1 : 0}
      themeOverridesLoaded=${await shouldLoadThemeOverrides(api, db)}
      icon="notion-enhancer${menuButtonIconStyle === "Monochrome"
        ? "?mask"
        : " text-[16px]"}"
      >${menuButtonLabel}
    <//>`;
  const appendToDom = () => {
    if (!document.body.contains($modal)) document.body.append($modal);
    else if (!document.body.contains($button)) {
      document.querySelector(inviteMember)?.after($button);
    } else removeMutationListener(appendToDom);
  };
  html`<${Tooltip}>
    <b>Configure the notion-enhancer and its mods</b>
  <//>`.attach($button, "right");
  addMutationListener(inviteMember, appendToDom);
  addMutationListener(".notion-app-inner", updateMenuTheme, { subtree: false });
  appendToDom();

  addKeyListener(openMenuHotkey, (event) => {
    event.preventDefault();
    event.stopPropagation();
    $modal.open();
  });
  addEventListener("message", (event) => {
    // from embedded menu
    if (event.data?.channel !== "notion-enhancer") return;
    if (event.data?.action === "close-menu") $modal.close();
    if (event.data?.action === "open-menu") $modal.open();
  });
  onMessage("notion-enhancer", (message) => {
    // from worker
    if (message === "open-menu") $modal.open();
  });
};

const insertPanel = async (api, db) => {
  const notionFrame = ".notion-frame",
    togglePanelHotkey = await db.get("togglePanelHotkey"),
    { html, setState, addMutationListener, removeMutationListener } = api;

  const $panel = html`<${Panel}
      hotkey="${togglePanelHotkey}"
      ...${Object.assign(
        ...["Width", "Open", "View"].map((key) => ({
          [`_get${key}`]: () => db.get(`panel${key}`),
          [`_set${key}`]: async (value) => {
            await db.set(`panel${key}`, value);
            setState({ rerender: true });
          },
        }))
      )}
    />`,
    appendToDom = () => {
      const $frame = document.querySelector(notionFrame);
      if (!$frame) return;
      $frame.append($panel);
      $frame.style.flexDirection = "row";
      removeMutationListener(appendToDom);
    };
  addMutationListener(notionFrame, appendToDom);
  appendToDom();
};

export default async (api, db) =>
  Promise.all([
    insertMenu(api, db),
    insertPanel(api, db),
    insertCustomStyles(api, db),
    loadThemeOverrides(api, db),
    // sendTelemetryPing(),
  ]).then(() => api.sendMessage("notion-enhancer", "load-complete"));
