/**
 * notion-enhancer
 * (c) 2024 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

import os from "node:os";
import fsp from "node:fs/promises";
import { resolve } from "node:path";
import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import asar from "@electron/asar";
import patch from "./patch-desktop-app.mjs";

const nodeRequire = createRequire(import.meta.url),
  platform =
    process.platform === "linux" &&
    os.release().toLowerCase().includes("microsoft")
      ? "wsl"
      : process.platform,
  getEnv = (name) => {
    if (platform !== "wsl" || process.env[name]) return process.env[name];
    // read windows environment variables and convert
    // windows paths to paths mounted in the wsl fs
    const pipe = { encoding: "utf8", stdio: "pipe" },
      value = execSync(`cmd.exe /c echo %${name}%`, pipe).trim(),
      isAbsolutePath = /^[a-zA-Z]:[\\\/]/.test(value),
      isSystemPath = /^[\\\/]/.test(value);
    if (isAbsolutePath) {
      // e.g. C:\Program Files
      const drive = value[0].toLowerCase(),
        path = value.slice(2).replace(/\\/g, "/");
      process.env[name] = `/mnt/${drive}${path}`;
    } else if (isSystemPath) {
      // e.g. \Program Files
      const drive = getEnv("SYSTEMDRIVE")[0].toLowerCase(),
        path = value.replace(/\\/g, "/");
      process.env[name] = `/mnt/${drive}${path}`;
    } else process.env[name] = value;
    return process.env[name];
  };

let __notionResources;
const setNotionPath = (path) => {
    // sets notion resource path to user provided value
    // e.g. with the --path cli option
    __notionResources = path;
  },
  getResourcePath = (...paths) => {
    if (__notionResources) return resolve(__notionResources, ...paths);
    // prettier-ignore
    for (const [platforms, notionResources] of [
      [['win32', 'wsl'], resolve(`${getEnv("LOCALAPPDATA")}/Programs/Notion/resources`)],
      [['win32', 'wsl'], resolve(`${getEnv("PROGRAMW6432")}/Notion/resources`)],
      [['darwin'], `/Users/${getEnv("USER")}/Applications/Notion.app/Contents/Resources`],
      [['darwin'], "/Applications/Notion.app/Contents/Resources"],
      [['linux'], "/opt/notion-app"],
    ]) {
      if (!platforms.includes(platform)) continue;
      if (!existsSync(notionResources)) continue;
      __notionResources = notionResources;
      return resolve(__notionResources, ...paths);
    }
  },
  extractFile = (path) => {
    const archive = getResourcePath("app.asar");
    return asar.extractFile(archive, path);
  };

const getInsertPath = (...paths) => {
    return "node_modules/notion-enhancer/" + paths.join("/");
  },
  getInsertVersion = () => {
    try {
      const manifest = extractFile(getInsertPath("package.json")).toString();
      return JSON.parse(manifest).version;
    } catch {
      return null;
    }
  };

const backupApp = async () => {
    const archive = getResourcePath("app.asar");
    if (!existsSync(archive)) return false;
    await fsp.cp(archive, archive + ".bak");
    return true;
  },
  restoreApp = async () => {
    const archive = getResourcePath("app.asar");
    if (!existsSync(archive + ".bak")) return false;
    await fsp.rename(archive + ".bak", archive);
    return true;
  },
  enhanceApp = async (debug = false, directoryMode = false) => {
    const app = getResourcePath("app"),
      archive = getResourcePath("app.asar");
    // directory mode acts on pre-extracted sources
    // as part of the notion-repackaged build process
    if (directoryMode) {
      if (!existsSync(app)) return false;
      for (let file of await fsp.readdir(app, { recursive: true })) {
        file = file.replace(/^\//g, "");
        const appPath = resolve(app, file),
          stat = await fsp.stat(appPath);
        if (stat.isFile()) {
          const content = await fsp.readFile(appPath);
          await fsp.writeFile(appPath, patch(file, content));
        }
      }
    } else {
      if (!existsSync(archive)) return false;
      if (existsSync(app)) await fsp.rm(app, { recursive: true, force: true });
      await fsp.mkdir(app);
      // extract archive to folder and apply patches
      for (let file of asar.listPackage(archive)) {
        file = file.replace(/^\//g, "");
        const stat = asar.statFile(archive, file),
          isFolder = !!stat.files,
          isSymlink = !!stat.link,
          isExecutable = stat.executable,
          appPath = resolve(app, file);
        if (isFolder) {
          await fsp.mkdir(appPath);
        } else if (isSymlink) {
          await fsp.symlink(appPath, resolve(app, link));
        } else {
          await fsp.writeFile(appPath, patch(file, extractFile(file)));
          if (isExecutable) await fsp.chmod(appPath, "755");
        }
      }
    }
    // insert the notion-enhancer/src folder into notion's node_modules
    const insertSrc = fileURLToPath(new URL("../src", import.meta.url)),
      insertDest = resolve(app, getInsertPath());
    await fsp.cp(insertSrc, insertDest, { recursive: true });
    // create package.json with cli-specific fields removed
    const insertManifest = resolve(insertDest, "package.json"),
      manifest = { ...nodeRequire("../package.json"), main: "init.js" },
      excludes = ["bin", "type", "scripts", "engines", "dependencies"];
    for (const key of excludes) delete manifest[key];
    await fsp.writeFile(insertManifest, JSON.stringify(manifest));
    if (!directoryMode) {
      // re-package enhanced sources into executable archive
      await asar.createPackage(app, archive);
      // cleanup extracted files unless in debug mode
      if (!debug) await fsp.rm(app, { recursive: true });
    }
    return true;
  };

export {
  backupApp,
  restoreApp,
  enhanceApp,
  getInsertVersion,
  getResourcePath,
  setNotionPath,
};
