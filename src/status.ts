import { STATUS_KEY, type FastModeConfig, type ModelRef } from "./types";
import { findMatchingTarget } from "./payload";

export type StatusText = "fast" | undefined;

export type StatusContext = {
  hasUI?: boolean;
  mode?: string;
  ui?: {
    setStatus?: (key: string, text: string | undefined) => void;
  };
};

export function getStatusText(
  config: FastModeConfig,
  model: ModelRef | undefined,
): StatusText {
  return config.enabled && findMatchingTarget(model, config.targets) ? "fast" : undefined;
}

export function canSetTuiStatus(ctx: StatusContext): boolean {
  if (!ctx.hasUI) return false;
  if (ctx.mode !== undefined && ctx.mode !== "tui") return false;
  return typeof ctx.ui?.setStatus === "function";
}

export function updateFastStatus(
  ctx: StatusContext,
  config: FastModeConfig,
  model: ModelRef | undefined,
): void {
  if (!canSetTuiStatus(ctx)) return;
  ctx.ui?.setStatus?.(STATUS_KEY, getStatusText(config, model));
}

export function clearFastStatus(ctx: StatusContext): void {
  if (!canSetTuiStatus(ctx)) return;
  ctx.ui?.setStatus?.(STATUS_KEY, undefined);
}
