import { html, render, svg } from "lit-html";
import type { RcColumnDetail } from "./getRcColumn";

import "./drawing.css";

type Point = {
  x: number;
  y: number;
};

export function getRcColumnDrawing({
  rcColumnDetails,
}: {
  rcColumnDetails: RcColumnDetail[];
}): HTMLDivElement {
  const container = document.createElement("div");
  container.className = "rc-column-drawing";
  const detail = rcColumnDetails[0];

  if (!detail) {
    render(
      html`<div class="rc-column-drawing-sheet">
        <p>No RC column detail is available.</p>
      </div>`,
      container,
    );
    return container;
  }

  const widthMm = toMm(detail.width);
  const depthMm = toMm(detail.depth);
  const heightMm = getLengthMm(detail);
  const coverMm = toMm(detail.cover);
  const mainBarDiaMm = toMm(detail.mainBarDiameter);
  const mainBarCount = detail.mainBarCount ?? 8;
  const linkDiaMm = toMm(detail.linkDiameter);
  const generalSpacingMm = toMm(detail.generalLinkSpacing);
  const tieCount = getTieCount(heightMm, generalSpacingMm);
  const mark = detail.mark ?? "C1";

  // --- Elevation: concrete outline with tie cage.
  // Width scales with the real width; the height (length) is fixed.
  const elevation = {
    x: 80,
    y: 150,
    width: clamp(Math.round(widthMm * (92 / 250)), 60, 150),
    height: 760,
  };
  const elevRightX = elevation.x + elevation.width;
  const coverPxE = clamp(
    Math.round((elevation.width * coverMm) / Math.max(widthMm, 1)),
    7,
    elevation.width / 3,
  );
  const cageLeftX = elevation.x + coverPxE;
  const cageRightX = elevRightX - coverPxE;
  // Longitudinal bars sit inside the tie cage; the tie wraps around them.
  const barInsetE = clamp(
    Math.round(
      (elevation.width * (linkDiaMm + mainBarDiaMm / 2)) / Math.max(widthMm, 1),
    ),
    6,
    16,
  );
  const barLeftX = cageLeftX + barInsetE;
  const barRightX = cageRightX - barInsetE;
  const cageTop = elevation.y + coverPxE;
  const cageBottom = elevation.y + elevation.height - coverPxE;
  // Height dimension sits just right of the (variable-width) elevation.
  const heightDimX = elevRightX + 84;

  // --- Section: concrete rectangle scaled to the real width:depth ratio,
  // anchored about a fixed center so it grows symmetrically.
  const SECTION_MAX_PX = 224;
  const SECTION_CX = 484;
  const SECTION_CY = 636;
  const sectionScale = SECTION_MAX_PX / Math.max(widthMm, depthMm, 1);
  const sectionWpx = Math.max(Math.round(widthMm * sectionScale), 60);
  const sectionHpx = Math.max(Math.round(depthMm * sectionScale), 60);
  const section = {
    x: SECTION_CX - sectionWpx / 2,
    y: SECTION_CY - sectionHpx / 2,
  };
  const sectionRightX = section.x + sectionWpx;
  const sectionBottomY = section.y + sectionHpx;
  // Cover is drawn proportionally, but the section is normalized to a fixed
  // display size, so on small sections the true cover ratio (e.g. 30mm on a
  // 100mm face) blows up into a huge gap. Cap it so small sections read as
  // tightly as the larger ones instead of leaving the cage floating.
  const coverPxS = clamp(
    Math.round(coverMm * sectionScale),
    8,
    Math.min(28, Math.min(sectionWpx, sectionHpx) / 3),
  );
  const sectionTie = {
    x: section.x + coverPxS,
    y: section.y + coverPxS,
    width: sectionWpx - 2 * coverPxS,
    height: sectionHpx - 2 * coverPxS,
  };
  const barRadius = clamp(Math.round((mainBarDiaMm * sectionScale) / 2) + 4, 7, 12);
  // Bars sit just inside the tie's inner face so the tie wraps around them.
  const sectionBarInset = barRadius + 2;
  const sectionBarRing = {
    x: sectionTie.x + sectionBarInset,
    y: sectionTie.y + sectionBarInset,
    width: sectionTie.width - 2 * sectionBarInset,
    height: sectionTie.height - 2 * sectionBarInset,
  };
  const sectionBars = getSectionBarPositions({
    count: mainBarCount,
    x: sectionBarRing.x,
    y: sectionBarRing.y,
    width: sectionBarRing.width,
    height: sectionBarRing.height,
  });
  // Callouts sit to the right of the (resized) section.
  const sectionTieCalloutX = sectionRightX + 108;
  const sectionBarCalloutX = sectionRightX + 118;

  // Elevation tie lines; the tie callout points at the one nearest the note.
  const tieYs = getTieYPositions(tieCount, cageTop, cageBottom - cageTop);
  const tieLeaderY = tieYs.reduce(
    (best, y) => (Math.abs(y - 330) < Math.abs(best - 330) ? y : best),
    tieYs[0],
  );

  render(
    html`
      <article class="rc-column-drawing-sheet">
        <svg
          class="rc-column-detail-svg"
          viewBox="0 0 940 1050"
          role="img"
          aria-label="Simplified reinforcement detail for RC column ${mark}"
        >
          <defs>
            <marker
              id="rc-column-arrow"
              viewBox="0 0 12 6"
              refX="12"
              refY="3"
              markerWidth="20"
              markerHeight="10"
              markerUnits="userSpaceOnUse"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 12 3 L 0 6 z"></path>
            </marker>
          </defs>

          <g class="drawing-layer">
            <line x1=${elevation.x} y1="34" x2=${elevation.x} y2=${elevation.y - 8} class="extension-line"></line>
            <line x1=${elevRightX} y1="34" x2=${elevRightX} y2=${elevation.y - 8} class="extension-line"></line>
            <line x1=${elevation.x} y1="58" x2=${elevRightX} y2="58" class="dimension-line"></line>
            <text x=${elevation.x + elevation.width / 2} y="50" class="dimension-text" text-anchor="middle">
              ${widthMm}
            </text>

            <rect
              x=${elevation.x}
              y=${elevation.y}
              width=${elevation.width}
              height=${elevation.height}
              class="concrete-core"
            ></rect>
            <line
              x1=${barLeftX}
              y1=${cageTop}
              x2=${barLeftX}
              y2=${cageBottom}
              class="rebar-line"
            ></line>
            <line
              x1=${barRightX}
              y1=${cageTop}
              x2=${barRightX}
              y2=${cageBottom}
              class="rebar-line"
            ></line>

            ${tieYs.map(
              (y) => svg`<line
                x1=${cageLeftX}
                y1=${y}
                x2=${cageRightX}
                y2=${y}
                class="link-line"
              ></line>`,
            )}

            <line
              x1=${heightDimX}
              y1=${elevation.y}
              x2=${heightDimX}
              y2=${elevation.y + elevation.height}
              class="height-dimension-line"
            ></line>
            <line
              x1=${elevRightX + 8}
              y1=${elevation.y}
              x2=${heightDimX + 8}
              y2=${elevation.y}
              class="extension-line"
            ></line>
            <line
              x1=${elevRightX + 8}
              y1=${elevation.y + elevation.height}
              x2=${heightDimX + 8}
              y2=${elevation.y + elevation.height}
              class="extension-line"
            ></line>
            <text
              x=${heightDimX - 42}
              y=${elevation.y + elevation.height / 2 + 8}
              class="height-text"
              text-anchor="middle"
            >
              ${heightMm}
            </text>

            <line x1=${cageRightX} y1=${tieLeaderY} x2="336" y2="274" class="leader-line"></line>
            <text x="336" y="262" class="callout">${tieCount} H${linkDiaMm} ${generalSpacingMm} TIES</text>
            <line x1="336" y1="274" x2="476" y2="274" class="note-underline"></line>

            <line x1=${barLeftX} y1="470" x2="336" y2="362" class="leader-line"></line>
            <text x="336" y="350" class="callout">${mainBarCount} H${mainBarDiaMm} LB</text>
            <line x1="336" y1="362" x2="458" y2="362" class="note-underline"></line>

            <line
              x1=${section.x}
              y1=${section.y - 54}
              x2=${sectionRightX}
              y2=${section.y - 54}
              class="dimension-line"
            ></line>
            <line x1=${section.x} y1=${section.y - 58} x2=${section.x} y2=${section.y - 6} class="extension-line"></line>
            <line
              x1=${sectionRightX}
              y1=${section.y - 58}
              x2=${sectionRightX}
              y2=${section.y - 6}
              class="extension-line"
            ></line>
            <text x=${section.x + sectionWpx / 2} y=${section.y - 62} class="dimension-text" text-anchor="middle">
              ${widthMm}
            </text>

            <rect
              x=${section.x}
              y=${section.y}
              width=${sectionWpx}
              height=${sectionHpx}
              class="concrete-core"
            ></rect>
            <rect
              x=${sectionTie.x}
              y=${sectionTie.y}
              width=${sectionTie.width}
              height=${sectionTie.height}
              rx=${1.2 * sectionBarInset}
              class="section-tie"
            ></rect>

            <path
              d=${`M ${sectionTie.x + sectionTie.width - 15} ${sectionTie.y + 5} l -13 13 M ${sectionTie.x + sectionTie.width - 4} ${sectionTie.y + 15} l -13 13`}
              class="tie-hook"
            ></path>
            ${sectionBars.map(
              ({ x, y }) => svg`<circle
                  cx=${x}
                  cy=${y}
                  r=${barRadius}
                  class="section-bar"
                ></circle>`,
            )}

            <line
              x1=${sectionRightX + 70}
              y1=${section.y}
              x2=${sectionRightX + 70}
              y2=${sectionBottomY}
              class="dimension-line"
            ></line>
            <line
              x1=${sectionRightX + 6}
              y1=${section.y}
              x2=${sectionRightX + 88}
              y2=${section.y}
              class="extension-line"
            ></line>
            <line
              x1=${sectionRightX + 6}
              y1=${sectionBottomY}
              x2=${sectionRightX + 88}
              y2=${sectionBottomY}
              class="extension-line"
            ></line>
            <text
              x=${sectionRightX + 102}
              y=${section.y + sectionHpx / 2 + 8}
              class="dimension-text"
              text-anchor="middle"
            >
              ${depthMm}
            </text>

            <line
              x1=${sectionBarRing.x + sectionBarRing.width}
              y1=${sectionBarRing.y}
              x2=${sectionBarCalloutX}
              y2="476"
              class="leader-line"
            ></line>
            <text x=${sectionBarCalloutX} y="464" class="callout">${mainBarCount} H${mainBarDiaMm} LB</text>
            <line x1=${sectionBarCalloutX} y1="476" x2=${sectionBarCalloutX + 132} y2="476" class="note-underline"></line>

            <line
              x1=${sectionTie.x + sectionTie.width}
              y1=${sectionTie.y + sectionTie.height / 2}
              x2=${sectionTieCalloutX}
              y2="534"
              class="leader-line"
            ></line>
            <text x=${sectionTieCalloutX} y="522" class="callout">${tieCount} H${linkDiaMm} ${generalSpacingMm} TIES</text>
            <line x1=${sectionTieCalloutX} y1="534" x2=${sectionTieCalloutX + 154} y2="534" class="note-underline"></line>

            <text x=${section.x + sectionWpx / 2} y=${sectionBottomY + 60} class="section-label" text-anchor="middle">
              SECTION
            </text>
            <line x1=${section.x + sectionWpx / 2 - 48} y1=${sectionBottomY + 72} x2=${section.x + sectionWpx / 2 + 48} y2=${sectionBottomY + 72} class="note-underline"></line>

            <text x="450" y="1010" class="drawing-title" text-anchor="middle">
              Column (${mark})
            </text>
          </g>
        </svg>
      </article>
    `,
    container,
  );

  return container;
}

function toMm(value: number): number {
  return Math.round(value * 1000);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getLengthMm(detail: RcColumnDetail): number {
  const [x1, y1, z1] = detail.start;
  const [x2, y2, z2] = detail.end;
  const length = Math.hypot(x2 - x1, y2 - y1, z2 - z1);

  return toMm(length);
}

function getTieCount(heightMm: number, spacingMm: number): number {
  if (spacingMm <= 0) return 1;

  return Math.floor(heightMm / spacingMm) + 1;
}

function getTieYPositions(count: number, y: number, height: number): number[] {
  if (count <= 1) return [y + height / 2];

  return Array.from({ length: count }, (_, index) => {
    return y + (index / (count - 1)) * height;
  });
}

function getSectionBarPositions({
  count,
  x,
  y,
  width,
  height,
}: {
  count: number;
  x: number;
  y: number;
  width: number;
  height: number;
}): Point[] {
  if (count <= 0) return [];
  if (count === 1) return [{ x: x + width / 2, y: y + height / 2 }];
  // Four bars sit exactly on the ring corners, matching the 3D cage.
  if (count === 4) {
    return [
      { x, y },
      { x: x + width, y },
      { x: x + width, y: y + height },
      { x, y: y + height },
    ];
  }

  const perimeter = 2 * (width + height);

  return Array.from({ length: count }, (_, index) => {
    const distance = (index / count) * perimeter;

    if (distance < width) return { x: x + distance, y };
    if (distance < width + height) {
      return { x: x + width, y: y + distance - width };
    }
    if (distance < 2 * width + height) {
      return { x: x + width - (distance - width - height), y: y + height };
    }

    return { x, y: y + height - (distance - 2 * width - height) };
  });
}
