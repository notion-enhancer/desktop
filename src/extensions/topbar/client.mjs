/**
 * notion-enhancer: topbar
 * (c) 2020 CloudHill <rl.cloudhill@gmail.com> (https://github.com/CloudHill)
 * (c) 2024 dragonwocky <thedragonring.bod@gmail.com> (https://dragonwocky.me/)
 * (https://notion-enhancer.github.io/) under the MIT license
 */

import { Tooltip } from "../../core/islands/Tooltip.mjs";
import { TopbarButton } from "../../core/islands/TopbarButton.mjs";

const pinLabel = "Pin always on top",
  unpinLabel = "Unpin always on top",
  pinTooltip = "Pin window as always on top",
  unpinTooltip = "Unpin window from always on top";

export default async function (api, db) {
  const { html, sendMessage } = api,
    { addMutationListener } = api,
    displayLabel = ($btn) => {
      if ($btn.innerHTML === $btn.ariaLabel) return;
      $btn.style.width = "auto";
      $btn.style.fontSize = "14px";
      $btn.style.lineHeight = "1.2";
      $btn.style.padding = "0px 8px";
      $btn.innerHTML = $btn.ariaLabel;
    },
    displayIcon = ($btn, $icon) => {
      if ($btn.style.width === "33px") return;
      $btn.style.width = "33px";
      $btn.style.padding = "0px";
      $btn.style.justifyContent = "center";
      $btn.innerHTML = "";
      $btn.append($icon.cloneNode(true));
    };

  // share button is text by default
  const shareSelector = ".notion-topbar-share-menu",
    shareButton = await db.get("shareButton"),
    shareIcon = await db.get("shareIcon"),
    $shareIcon = shareIcon
      ? html(shareIcon.content)
      : html`<i class="i-share2 size-[20px]"></i>`;
  addMutationListener(shareSelector, () => {
    for (const $btn of document.querySelectorAll(shareSelector)) {
      if (shareButton === "Icon") displayIcon($btn, $shareIcon);
      if (shareButton === "Disabled" && $btn.style.display !== "none")
        $btn.style.display = "none";
    }
  });

  const commentsSelector = ".notion-topbar-comments-button",
    commentsButton = await db.get("commentsButton"),
    commentsIcon = await db.get("commentsIcon"),
    $commentsIcon = commentsIcon ? html(commentsIcon.content) : undefined;
  addMutationListener(commentsSelector, () => {
    for (const $btn of document.querySelectorAll(commentsSelector)) {
      if (commentsButton === "Text") displayLabel($btn);
      if (commentsButton === "Icon" && commentsIcon)
        displayIcon($btn, $commentsIcon);
      if (commentsButton === "Disabled" && $btn.style.display !== "none")
        $btn.style.display = "none";
    }
  });

  const updatesSelector = ".notion-topbar-updates-button",
    updatesButton = await db.get("updatesButton"),
    updatesIcon = await db.get("updatesIcon"),
    $updatesIcon = updatesIcon ? html(updatesIcon.content) : undefined;
  addMutationListener(updatesSelector, () => {
    for (const $btn of document.querySelectorAll(updatesSelector)) {
      if (updatesButton === "Text") displayLabel($btn);
      if (updatesButton === "Icon" && updatesIcon)
        displayIcon($btn, $updatesIcon);
      if (updatesButton === "Disabled" && $btn.style.display !== "none")
        $btn.style.display = "none";
    }
  });

  const favoriteSelector = ".notion-topbar-favorite-button",
    favoriteButton = await db.get("favoriteButton"),
    favoriteIcon = await db.get("favoriteIcon"),
    $favoriteIcon = favoriteIcon ? html(favoriteIcon.content) : undefined;
  addMutationListener(favoriteSelector, () => {
    for (const $btn of document.querySelectorAll(favoriteSelector)) {
      if (favoriteButton === "Text") displayLabel($btn);
      if (favoriteButton === "Icon" && favoriteIcon)
        displayIcon($btn, $favoriteIcon);
      if (favoriteButton === "Disabled" && $btn.style.display !== "none")
        $btn.style.display = "none";
    }
  });

  const moreSelector = ".notion-topbar-more-button",
    moreButton = await db.get("moreButton"),
    moreIcon = await db.get("moreIcon"),
    $moreIcon = moreIcon ? html(moreIcon.content) : undefined;
  addMutationListener(moreSelector, () => {
    for (const $btn of document.querySelectorAll(moreSelector)) {
      if (!$btn.ariaLabel) $btn.ariaLabel = "More";
      if (moreButton === "Text") displayLabel($btn);
      if (moreButton === "Icon" && moreIcon) displayIcon($btn, $moreIcon);
      if (moreButton === "Disabled" && $btn.style.display !== "none")
        $btn.style.display = "none";
    }
  });

  if (!["linux", "win32", "darwin"].includes(api.platform)) return;
  const alwaysOnTopButton = await db.get("alwaysOnTopButton");
  if (alwaysOnTopButton === "Disabled") return;
  const notionTopbar = ".notion-topbar",
    pinIcon = await db.get("pinIcon"),
    unpinIcon = await db.get("unpinIcon"),
    $pin = html`<${TopbarButton}
      onclick=${() => {
        sendMessage("notion-enhancer:topbar", "pin-always-on-top");
        $pin.style.display = "none";
        $unpin.style.display = "";
      }}
      aria-label="${pinLabel}"
      innerHTML="${alwaysOnTopButton === "Icon"
        ? pinIcon?.content
        : `<span>${pinLabel}</span>`}"
      icon="pin"
    />`,
    $unpin = html`<${TopbarButton}
      onclick=${() => {
        sendMessage("notion-enhancer:topbar", "unpin-always-on-top");
        $unpin.style.display = "none";
        $pin.style.display = "";
      }}
      aria-label="${unpinLabel}"
      innerHTML="${alwaysOnTopButton === "Icon"
        ? unpinIcon?.content
        : `<span>${unpinLabel}</span>`}"
      style="display: none"
      icon="pin-off"
    />`,
    addToTopbar = () => {
      if (document.contains($pin)) return;
      document.querySelector(favoriteSelector)?.after($pin, $unpin);
    };
  html`<${Tooltip}><b>${pinTooltip}</b><//>`.attach($pin, "bottom");
  html`<${Tooltip}><b>${unpinTooltip}</b><//>`.attach($unpin, "bottom");
  addMutationListener(notionTopbar, addToTopbar, { subtree: false });
  addToTopbar();
}
