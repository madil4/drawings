import van, { State } from "vanjs-core";
import { html, render } from "lit-html";

import "./controls.css";

export function getColumnControls({
  width,
  depth,
}: {
  width: State<number>;
  depth: State<number>;
}): HTMLElement {
  const container = document.createElement("div");

  const template = () => html`
    <details id="column-controls" open>
      <summary>Column</summary>
      <div class="column-controls-item">
        <label>Width (mm)</label>
        <input
          type="range"
          min="100"
          max="500"
          step="10"
          .value=${Math.round(width.val * 1000)}
          @input=${(e: Event) =>
            (width.val = Number((e.target as HTMLInputElement).value) / 1000)}
        />
        <span class="value-display">${Math.round(width.val * 1000)}</span>
      </div>
      <div class="column-controls-item">
        <label>Depth (mm)</label>
        <input
          type="range"
          min="100"
          max="500"
          step="10"
          .value=${Math.round(depth.val * 1000)}
          @input=${(e: Event) =>
            (depth.val = Number((e.target as HTMLInputElement).value) / 1000)}
        />
        <span class="value-display">${Math.round(depth.val * 1000)}</span>
      </div>
    </details>
  `;

  van.derive(() => render(template(), container));

  return container.firstElementChild as HTMLElement;
}
