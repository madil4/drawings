import van from "vanjs-core";
import { getCanvas } from "./ui/canvas/getCanvas";
import { getLayout } from "./ui/layout/getLayout";
import { getColumnViewer } from "./ui/viewer/getColumnViewer";
import { getRcColumnDrawing } from "./ui/viewer/rcColumn/getRcColumnDrawing";
import { getColumnControls } from "./ui/viewer/rcColumn/getColumnControls";
import type { RcColumnDetail } from "./ui/viewer/rcColumn/getRcColumn";

const rcColumnC1: Omit<RcColumnDetail, "width" | "depth"> = {
  start: [2, 0, 0],
  end: [2, 0, 3],
  cover: 0.03,
  mainBarDiameter: 0.012,
  mainBarCount: 4,
  linkDiameter: 0.008,
  generalLinkSpacing: 0.15,
  endLinkSpacing: 0.1,
  endZoneLength: 0.3,
  mark: "J-16",
  jacketThickness: 0.02,
};

// Parametric cross-section dimensions (meters), driven by the on-screen controls.
const width = van.state(0.25);
const depth = van.state(0.25);

const rcColumnDetails = van.derive<RcColumnDetail[]>(() => [
  { ...rcColumnC1, width: width.val, depth: depth.val },
]);

const canvasButton = van.state<string | null>("Drawings");
const canvas = van.state<HTMLElement | null>(null);

van.derive(() => {
  canvas.val =
    canvasButton.val === "Drawings"
      ? getRcColumnDrawing({ rcColumnDetails: rcColumnDetails.val })
      : null;
});

document.body.append(
  getLayout({
    viewer: getColumnViewer({
      rcColumnDetails,
      controls: getColumnControls({ width, depth }),
    }),
    canvas: getCanvas({
      canvas,
      canvasButton,
      showCloseButton: false,
    }),
  }),
);
