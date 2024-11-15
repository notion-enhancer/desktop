/**
 * notion-enhancer
 * (c) 2024 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

"use strict";

const IS_ELECTRON = typeof module !== "undefined",
  IS_RENDERER = IS_ELECTRON && process.type === "renderer";

// expected values: 'linux', 'win32', 'darwin' (== macos), 'firefox'
// and 'chromium' (inc. chromium-based browsers like edge and brave)
// other possible values: 'aix', 'freebsd', 'openbsd', 'sunos'
const platform = IS_ELECTRON
    ? process.platform
    : navigator.userAgent.includes("Firefox")
    ? "firefox"
    : "chromium",
  // currently installed version of the notion-enhancer
  version = IS_ELECTRON
    ? require("notion-enhancer/package.json").version
    : chrome.runtime.getManifest().version,
  // packages a url to access notion-enhancer assets and sources,
  // proxies via api in desktop app to bypass service worker cache
  enhancerUrl = (target = "") =>
    IS_ELECTRON
      ? "https://www.notion.so/api/__notion-enhancer/" +
        target.replace(/^\//, "")
      : chrome.runtime.getURL(target),
  // require a file from the root of notion's app/ folder,
  // only available in an electron main process
  notionRequire = (target) =>
    IS_ELECTRON && !IS_RENDERER ? require(`../../../${target}`) : undefined;

let __port;
const connectToPort = () => {
    if (__port) return;
    __port = chrome.runtime.connect();
    __port.onDisconnect.addListener(() => (__port = null));
  },
  onMessage = (channel, listener) => {
    // from worker to client
    if (IS_RENDERER) {
      const { ipcRenderer } = require("electron");
      ipcRenderer.on(channel, (event, message) => listener(message));
    } else if (!IS_ELECTRON) {
      const onMessage = (msg) => {
        if (msg?.channel !== channel || msg?.invocation) return;
        listener(msg.message);
      };
      connectToPort();
      __port.onMessage.addListener(onMessage);
      chrome.runtime.onMessage.addListener(onMessage);
    }
  },
  sendMessage = (channel, message) => {
    // to worker from client
    if (IS_RENDERER) {
      const { ipcRenderer } = require("electron");
      ipcRenderer.send(channel, message);
    } else if (!IS_ELECTRON) {
      connectToPort();
      __port.postMessage({ channel, message });
    }
  },
  invokeInWorker = (channel, message) => {
    // sends a payload to the worker/main
    // process and waits for a response
    if (IS_RENDERER) {
      const { ipcRenderer } = require("electron");
      return ipcRenderer.invoke(channel, message);
    } else if (!IS_ELECTRON) {
      // polyfills the electron.ipcRenderer.invoke method in
      // the browser: uses a long-lived ipc connection to
      // pass messages and handle responses asynchronously
      let fulfilled;
      connectToPort();
      const id = crypto.randomUUID();
      return new Promise((res, rej) => {
        __port.onMessage.addListener((msg) => {
          if (msg?.invocation !== id || fulfilled) return;
          fulfilled = true;
          res(msg.message);
        });
        __port.postMessage({ channel, message, invocation: id });
      });
    }
  };

const readFile = (file) => {
    if (IS_ELECTRON) {
      // read directly from filesys if possible,
      // treating notion-enhancer/src as fs root
      if (!file.startsWith("http")) {
        const fsp = require("fs/promises"),
          { resolve } = require("path");
        return fsp.readFile(resolve(`${__dirname}/../${file}`), "utf-8");
      }
    } else file = file.startsWith("http") ? file : enhancerUrl(file);
    return fetch(file).then((res) => res.text());
  },
  readJson = (file) => {
    // as above, uses require instead of readFile
    // and res.json() instead of res.text() to return
    // json content of file in object form
    if (IS_ELECTRON) {
      if (!file.startsWith("http")) {
        const { resolve } = require("path");
        return require(resolve(`${__dirname}/../${file}`));
      }
    } else file = file.startsWith("http") ? file : enhancerUrl(file);
    return fetch(file).then((res) => res.json());
  };

const initDatabase = (namespace, fallbacks = {}) => {
    // all db operations are performed via ipc:
    // with nodeintegration disabled, sqlite cannot
    // be require()-d from the renderer process
    const query = (query, args = {}) =>
      IS_ELECTRON && !IS_RENDERER
        ? globalThis.__enhancerApi.queryDatabase(namespace, query, args)
        : invokeInWorker("notion-enhancer", {
            action: "query-database",
            data: { namespace, query, args },
          });
    return {
      get: (key) => query("get", { key, fallbacks }),
      set: (key, value) => query("set", { key, value }),
      remove: (keys) => query("remove", { keys }),
      export: () => query("export"),
      import: (obj) => query("import", { obj }),
    };
  },
  reloadApp = () => {
    if (IS_ELECTRON && !IS_RENDERER) {
      const { app } = require("electron");
      app.relaunch(), app.exit();
    } else sendMessage("notion-enhancer", "reload-app");
  };

Object.assign((globalThis.__enhancerApi ??= {}), {
  platform,
  version,
  enhancerUrl,
  notionRequire,
  onMessage,
  sendMessage,
  invokeInWorker,
  readFile,
  readJson,
  initDatabase,
  reloadApp,
});
