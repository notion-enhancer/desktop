/**
 * notion-enhancer
 * (c) 2023 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

// patch scripts within notion's sources to
// activate and respond to the notion-enhancer
const injectTriggerOnce = (file, content) =>
    content +
    (!/require\(['|"]notion-enhancer['|"]\)/.test(content)
      ? `\n\nrequire("notion-enhancer")("${file}",exports,(js)=>eval(js));`
      : ""),
  replaceIfNotFound = ({ string, mode = "replace" }, search, replacement) =>
    string.includes(replacement)
      ? string
      : string.replace(
          search,
          typeof replacement === "string" && mode === "append"
            ? `$&${replacement}`
            : typeof replacement === "string" && mode === "prepend"
            ? `${replacement}$&`
            : replacement
        );

const patches = {
  // prettier-ignore
  ".webpack/main/index.js": (file, content) => {
    content = injectTriggerOnce(file, content);
    const replace = (...args) =>
        (content = replaceIfNotFound(
          { string: content, mode: "replace" },
          ...args
        )),
      prepend = (...args) =>
        (content = replaceIfNotFound(
          { string: content, mode: "prepend" },
          ...args
        )),
      append = (...args) =>
        (content = replaceIfNotFound(
          { string: content, mode: "append" },
          ...args
        ));

    // https://github.com/notion-enhancer/notion-enhancer/issues/160:
    // run the app in windows mode on linux (instead of macos mode)
    const isWindows =
        /(?:"win32"===process\.platform(?:(?=,isFullscreen)|(?=&&\w\.BrowserWindow)|(?=&&\(\w\.app\.requestSingleInstanceLock)))/g,
      isWindowsOrLinux = '["win32","linux"].includes(process.platform)';
    replace(isWindows, isWindowsOrLinux);

    // restore node integration in the renderer process
    // so the notion-enhancer can be require()-d into it
    replace(/sandbox:!0/g, `sandbox:!1,nodeIntegration:!0,session:require('electron').session.fromPartition("persist:notion")`);

    // expose the app's config + cache + preferences to the global namespace
    // e.g. to enable development mode or check if keep in background is enabled
    prepend(/\w\.exports=JSON\.parse\('\{"env":"production"/, "globalThis.__notionConfig=");
    prepend(/\w\.updatePreferences=\w\.updatePreferences/, "globalThis.__updatePreferences=");
    prepend(/\w\.Store=\(0,\w\.configureStore\)/, "globalThis.__notionStore=");

    return content;
  },
  ".webpack/renderer/tabs/preload.js": injectTriggerOnce,
  ".webpack/renderer/tab_browser_view/preload.js": injectTriggerOnce,
};

const decoder = new TextDecoder(),
  encoder = new TextEncoder();
export default (file, content) => {
  if (!patches[file]) return content;
  content = decoder.decode(content);
  content = patches[file](file, content);
  return encoder.encode(content);
};
