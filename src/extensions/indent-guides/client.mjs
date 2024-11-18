/**
 * notion-enhancer: indent guides
 * (c) 2020 Alexa Baldon <alnbaldon@gmail.com> (https://github.com/runargs)
 * (c) 2024 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

export default async function (api, db) {
  const lineType = await db.get("lineType"),
    rainbowMode = await db.get("rainbowMode");
  document.body.style.setProperty("--guide--style", lineType.toLowerCase());

  // switch (await db.get(["style"])) {
  //   case "dashed":
  //     style = "dashed";
  //     break;
  //   case "dotted":
  //     style = "dotted";
  //     break;
  //   case "soft":
  //     opacity = 0.25;
  //     break;
  //   case "rainbow":
  //     opacity = 0.7;
  //     rainbow = true;
  //     break;
  // }

  // const colors = ['red', 'pink', 'purple', 'blue', 'green', 'yellow'];
  // colors.push(...colors, ...colors, ...colors, 'gray');

  // for (const listType of ['bulleted_list', 'numbered_list', 'to_do', 'toggle']) {
  //   if (!(await db.get([listType]))) continue;
  //   css += `
  //     .notion-page-content .notion-${listType}-block > div > div:last-child::before {
  //       border-left: 1px ${style} var(--indentation_lines--color, currentColor);
  //       opacity: ${opacity};
  //     }`;

  //   if (rainbow) {
  //     for (let i = 0; i < colors.length; i++) {
  //       css += `
  //         .notion-page-content ${`.notion-${listType}-block `.repeat(i + 1)}
  //           > div > div:last-child::before {
  //           --indentation_lines--color: var(--theme--text_${colors[i]});
  //         }`;
  //     }
  //   }
  // }

  // if (await db.get(['toggle_header'])) {
  //   css += `
  //     .notion-page-content [class$=header-block] > div > div > div:last-child::before {
  //       border-left: 1px ${style} var(--indentation_lines--color, currentColor);
  //       opacity: ${opacity};
  //     }`;

  //   if (rainbow) {
  //     for (let i = 0; i < colors.length; i++) {
  //       css += `
  //       .notion-page-content ${`[class$=header-block] `.repeat(i + 1)}
  //         > div > div > div:last-child::before{
  //         --indentation_lines--color: var(--theme--text_${colors[i]});
  //       }`;
  //     }
  //   }
  // }
}
