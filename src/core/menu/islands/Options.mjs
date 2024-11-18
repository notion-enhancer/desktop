/**
 * notion-enhancer
 * (c) 2023 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

import { Heading } from "./Heading.mjs";
import { Description } from "./Description.mjs";
import { Input } from "./Input.mjs";
import { Select } from "./Select.mjs";
import { Toggle } from "./Toggle.mjs";

const camelToSentenceCase = (string) =>
    string[0].toUpperCase() +
    string.replace(/[A-Z]/g, (match) => ` ${match.toLowerCase()}`).slice(1),
  filterOptionsForRender = (options) => {
    const { platform } = globalThis.__enhancerApi;
    options = options.reduce((options, opt) => {
      // option must have key, headings may use label
      if (!opt.key && (opt.type !== "heading" || !opt.label)) return options;
      // ignore platform-specific options
      if (opt.platforms && !opt.platforms.includes(platform)) return options;
      // replace consective headings
      opt._autoremoveIfSectionEmpty ??= true;
      const prev = options[options.length - 1],
        canReplacePrev =
          prev?._autoremoveIfSectionEmpty && prev?.type === opt.type;
      if (opt.type === "heading" && canReplacePrev) {
        options[options.length - 1] = opt;
      } else options.push(opt);
      return options;
    }, []);
    // remove trailing heading
    return options.at(-1)?.type === "heading" &&
      options.at(-1)?._autoremoveIfSectionEmpty
      ? options.slice(0, -1)
      : options;
  };

function Option({ _get, _set, ...opt }) {
  const { html } = globalThis.__enhancerApi;
  return html`<${opt.type === "toggle" ? "label" : "div"}
    class="notion-enhancer--menu-option flex items-center justify-between
    mb-[18px] ${opt.type === "toggle" ? "cursor-pointer" : ""}"
  >
    <div class="flex-(~ col) ${opt.type === "text" ? "w-full" : "mr-[10%]"}">
      <h5 class="text-[14px] mb-[2px] mt-0">${opt.label}</h5>
      ${opt.type === "text"
        ? html`<${Input}
            type="text"
            class="mt-[4px] mb-[8px]"
            ...${{ _get, _set }}
          />`
        : ""}
      ${["string", "undefined"].includes(typeof opt.description)
        ? html`<${Description} innerHTML=${opt.description} />`
        : html`<${Description}>${opt.description}<//>`}
    </div>
    ${["number", "hotkey", "color"].includes(opt.type)
      ? html`<${Input}
          type=${opt.type}
          class="shrink-0 !w-[192px]"
          ...${{ _get, _set }}
        />`
      : opt.type === "file"
      ? html`<${Input}
          type="file"
          extensions=${opt.extensions}
          ...${{ _get, _set }}
        />`
      : opt.type === "select"
      ? html`<${Select} values=${opt.values} ...${{ _get, _set }} />`
      : opt.type === "toggle"
      ? html`<${Toggle} ...${{ _get, _set }} />`
      : ""}
  <//>`;
}

function Options({ mod }) {
  const { html, modDatabase, setState } = globalThis.__enhancerApi;
  return filterOptionsForRender(mod.options).map((opt) => {
    opt.label ??= camelToSentenceCase(opt.key);
    if (opt.type === "heading") {
      return typeof opt.description === "string"
        ? html`<div class="mb-[18px]">
            <${Heading}>${opt.label}<//>
            <${Description} innerHTML=${opt.description} />
          </div>`
        : html`<${Heading}>${opt.label}<//>`;
    }
    const _get = async () => (await modDatabase(mod.id)).get(opt.key),
      _set = async (value) => {
        await (await modDatabase(mod.id)).set(opt.key, value);
        setState({ rerender: true });
      };
    return html`<${Option} ...${{ _get, _set, ...opt }} />`;
  });
}

export { Options, Option };
