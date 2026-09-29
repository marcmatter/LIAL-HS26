"use client";

import { useState, type ReactNode } from "react";
import Scene3D, { type SceneObject, type ViewMode } from "@/components/scene3d/Scene3D";
import { Segmented } from "./ui";
import { useT } from "@/lib/i18n/lang";

interface WorkspaceProps {
  /** Inputs, formulas and explanations (left column). */
  children: ReactNode;
  objects: SceneObject[];
  /** The 3D/2D view the scene starts in; remount with a new `key` to reset it. */
  defaultView: ViewMode;
  legend?: ReactNode;
  /** Extra controls shown under the scene (e.g. an animation slider). */
  sceneControls?: ReactNode;
  sceneHeader?: ReactNode;
}

/** Two-column layout: explanation on the left, a sticky visualisation on the right. */
export default function Workspace({ children, objects, defaultView, legend, sceneControls, sceneHeader }: WorkspaceProps) {
  const [view, setView] = useState<ViewMode>(defaultView);
  const t = useT();
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
      <div className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {sceneHeader ?? <span />}
          <Segmented
            label={t("View", "Ansicht")}
            value={view}
            onChange={setView}
            options={[
              { value: "3d", label: "3D" },
              { value: "2d", label: t("2D (xy-plane)", "2D (xy-Ebene)") },
            ]}
          />
        </div>
        <Scene3D objects={objects} view={view} />
        {legend}
        {sceneControls}
      </div>
    </div>
  );
}
