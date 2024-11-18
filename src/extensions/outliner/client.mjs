/**
 * notion-enhancer: outliner
 * (c) 2021 CloudHill <rl.cloudhill@gmail.com> (https://github.com/CloudHill)
 * (c) 2024 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

import { Heading } from "./islands/Heading.mjs";
import { PanelDescription } from "./islands/PanelDescription.mjs";

export default async (api, db) => {
  const { html, debounce, addMutationListener, addPanelView } = api,
    behavior = (await db.get("smoothScrolling")) ? "smooth" : "auto",
    scroller = ".notion-frame .notion-scroller",
    equation = ".notion-text-equation-token",
    annotation = (await db.get("equationRendering"))
      ? ".katex-html"
      : ".katex-mathml annotation",
    page = ".notion-page-content",
    headings = [
      ".notion-header-block",
      ".notion-sub_header-block",
      ".notion-sub_sub_header-block",
    ],
    $toc = html`<div></div>`;
  addPanelView({
    title: "Outliner",
    // prettier-ignore
    $icon: html`<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24">
      <circle cx="5" cy="7" r="2.8"/>
      <circle cx="5" cy="17" r="2.79"/>
      <path d="M21,5.95H11c-0.55,0-1-0.45-1-1v0c0-0.55,0.45-1,1-1h10c0.55,0,1,0.45,1,1v0C22,5.5,21.55,5.95,21,5.95z"/>
      <path d="M17,10.05h-6c-0.55,0-1-0.45-1-1v0c0-0.55,0.45-1,1-1h6c0.55,0,1,0.45,1,1v0C18,9.6,17.55,10.05,17,10.05z"/>
      <path d="M21,15.95H11c-0.55,0-1-0.45-1-1v0c0-0.55,0.45-1,1-1h10c0.55,0,1,0.45,1,1v0C22,15.5,21.55,15.95,21,15.95z" />
      <path d="M17,20.05h-6c-0.55,0-1-0.45-1-1v0c0-0.55,0.45-1,1-1h6c0.55,0,1,0.45,1,1v0C18,19.6,17.55,20.05,17,20.05z"/>
    </svg>`,
    $view: html`<section>
      <${PanelDescription}>Click on a heading to jump to it.<//>
      ${$toc}
    </section>`,
  });

  const replaceFloatingOutline = await db.get("replaceFloatingOutline");
  if (replaceFloatingOutline) {
    document.head.append(html`<style>
      .hide-scrollbar.ignore-scrolling-container:has(
          div:empty[style*="width"]
        ) {
        display: none !important;
      }
    </style>`);
  }

  let $page, $scroller;
  const getHeadings = () => {
      if (!$page) return [];
      return [...$page.querySelectorAll(headings.join(", "))];
    },
    getHeadingLevel = ($heading) => {
      for (let i = 0; i < headings.length; i++)
        if ($heading.matches(headings[i])) return i + 1;
    },
    getHeadingTitle = ($heading) => {
      if (!$heading.innerText) return "Untitled";
      let title = "";
      for (const node of $heading.querySelector("h2, h3, h4").childNodes) {
        if (node.nodeType === 3) title += node.textContent;
        else if (node.matches(equation)) {
          // https://github.com/notion-enhancer/repo/issues/39
          const $katex = node.querySelector(annotation);
          title += $katex.textContent;
        } else title += node.innerText;
      }
      return title;
    },
    getBlockOffset = ($block) => {
      let offset = 0;
      while (!$block.matches("[data-content-editable-root]")) {
        offset += $block.offsetTop;
        $block = $block.offsetParent;
      }
      return offset;
    },
    updateHeadings = debounce(() => {
      $toc.innerHTML = "";
      if (!$page) return;
      let indent = 0,
        prev_level = 0;
      const $frag = document.createDocumentFragment();
      for (const $heading of getHeadings()) {
        const level = getHeadingLevel($heading);
        if (level === 1) indent = 1;
        else if (level > prev_level) indent = Math.min(indent + 1, level);
        else if (level < prev_level) indent = Math.max(indent - 1, level);
        prev_level = level;
        $heading._$outline = html`<${Heading}
          ...${{ indent }}
          onclick=${() => {
            if (!$scroller) return;
            const top = getBlockOffset($heading) - 24;
            $scroller.scrollTo({ top, behavior });
          }}
          >${getHeadingTitle($heading)}
        <//>`;
        $frag.append($heading._$outline);
      }
      $toc.append($frag);
      onScroll();
    });

  const $progressMarker = html`<span
      class="absolute block left-[6px] top-[calc(50%-1px)]
      size-[6px] rounded-full bg-[color:var(--theme--fg-secondary)]"
    ></span>`,
    onScroll = () => {
      if (!$scroller) return;
      const $h = getHeadings().find(($h) => {
        return $scroller.scrollTop < getBlockOffset($h) - 16;
      })?._$outline;
      if ($h) $h.prepend($progressMarker);
    },
    setup = () => {
      if (document.contains($page)) return;
      $page = document.querySelector(page);
      $scroller = document.querySelector(scroller);
      $scroller?.removeEventListener("scroll", onScroll);
      $scroller?.addEventListener("scroll", onScroll);
      updateHeadings();
    };

  const semanticHeadings = '[class$="header-block"] :is(h2, h3, h4)';
  addMutationListener(`${page} ${semanticHeadings}`, updateHeadings);
  addMutationListener(`${page}, ${scroller}`, setup, { subtree: false });
  setup();
};
