/**
 * notion-enhancer: indent guides
 * (c) 2020 Alexa Baldon <alnbaldon@gmail.com> (https://github.com/runargs)
 * (c) 2024 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

export default async function (api, db) {
  const { html } = api,
    guideStyle = await db.get("guideStyle"),
    rainbowMode = await db.get("rainbowMode");
  document.body.style.setProperty("--guide--style", guideStyle.toLowerCase());

  const nestedTargets = [],
    outlineTargets = [];
  for (const [listType, selectors] of [
    ["to-doList", [".notion-to_do-block"]],
    ["bulletedList", [".notion-bulleted_list-block"]],
    ["numberedList", [".notion-numbered_list-block"]],
    ["toggleList", [".notion-toggle-block"]],
    [
      "toggleHeadings",
      [
        ".notion-header-block",
        ".notion-sub_header-block",
        ".notion-sub_sub_header-block",
      ],
    ],
  ]) {
    if (await db.get(listType)) nestedTargets.push(...selectors);
  }
  if (await db.get("tableOfContents"))
    outlineTargets.push(".notion-table_of_contents-block");
  if (await db.get("outliner"))
    outlineTargets.push(".notion-enhancer--outliner-heading");

  let css = `${[...nestedTargets, ...outlineTargets].join(",")} {
    --guide--opacity: 1;
  }`;
  if (rainbowMode) {
    const opacity = `--guide--opacity: 0.5;`,
      selector = `:is(${nestedTargets.join(",")})`,
      colours = ["green", "blue", "purple", "pink", "red", "orange", "yellow"];
    colours.push(...colours, ...colours, ...colours, "gray");
    for (let i = 0; i < colours.length; i++) {
      css += `${(selector + " ").repeat(i + 1)} {
        --guide--color: var(--theme--fg-${colours[i]});
        ${opacity}
      }`;
    }
    css += `
    .notion-table_of_contents-block [contenteditable="false"] a
      > div[style*="margin-left: 24px"],
    .notion-enhancer--outliner-heading.pl-\\[36px\\] {
      --guide--color: var(--theme--fg-${colours[0]});
       ${opacity}
    }
    .notion-table_of_contents-block [contenteditable="false"] a
      > div[style*="margin-left: 48px"],
    .notion-enhancer--outliner-heading.pl-\\[54px\\] {
      --guide--color: var(--theme--fg-${colours[1]});
       ${opacity}
    }`;
  }
  document.head.append(html`<style innerHTML=${css}></style>`);
}
