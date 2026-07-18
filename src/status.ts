import {
  FooterComponent,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { findMatchingTarget } from "./payload";
import { STATUS_KEY, type FastModeConfig, type ModelRef } from "./types";

export type StatusText = "fast" | undefined;

type FooterFactory = Parameters<ExtensionContext["ui"]["setFooter"]>[0];

export type StatusContext = {
  hasUI?: boolean;
  mode?: string;
  model?: unknown;
  modelRegistry?: unknown;
  sessionManager?: unknown;
  getContextUsage?: () => unknown;
  ui?: {
    setStatus?: (key: string, text: string | undefined) => void;
    setFooter?: (factory: FooterFactory) => void;
  };
};

export function getStatusText(
  config: FastModeConfig,
  model: ModelRef | undefined,
): StatusText {
  return config.enabled && findMatchingTarget(model, config.targets)
    ? "fast"
    : undefined;
}

export function canSetTuiStatus(ctx: StatusContext): boolean {
  return (
    ctx.hasUI === true &&
    (ctx.mode === undefined || ctx.mode === "tui") &&
    (typeof ctx.ui?.setFooter === "function" ||
      typeof ctx.ui?.setStatus === "function")
  );
}

function installFastFooter(
  ctx: StatusContext,
  getThinkingLevel: () => string,
): void {
  const runtime = ctx as unknown as Pick<
    ExtensionContext,
    | "model"
    | "modelRegistry"
    | "sessionManager"
    | "getContextUsage"
  >;

  const auth = {
    isUsingOAuth: (model: unknown) =>
      runtime.modelRegistry.isUsingOAuth(model as never),
  };
  const session = {
    get state() {
      const model = runtime.model;
      const thinkingLevel = getThinkingLevel();
      return {
        model:
          model && !model.reasoning
            ? { ...model, id: `${model.id} • fast` }
            : model,
        thinkingLevel:
          thinkingLevel === "off"
            ? "thinking off • fast"
            : `${thinkingLevel} • fast`,
      };
    },
    sessionManager: runtime.sessionManager,
    getContextUsage: () => runtime.getContextUsage(),
    modelRegistry: auth,
    modelRuntime: auth,
  };

  ctx.ui?.setFooter?.((tui, _theme, footerData) => {
    const footer = new FooterComponent(session as never, footerData);
    const unsubscribe = footerData.onBranchChange(() => tui.requestRender());

    return {
      render: (width: number) => footer.render(width),
      invalidate: () => footer.invalidate(),
      dispose: () => {
        unsubscribe();
        footer.dispose();
      },
    };
  });
}

export function updateFastStatus(
  ctx: StatusContext,
  config: FastModeConfig,
  model: ModelRef | undefined,
  getThinkingLevel: () => string = () => "off",
  footerInstalled = false,
): boolean {
  if (!canSetTuiStatus(ctx)) return footerInstalled;

  const text = getStatusText(config, model);
  if (typeof ctx.ui?.setFooter === "function") {
    ctx.ui.setStatus?.(STATUS_KEY, undefined);
    if (text) {
      installFastFooter(ctx, getThinkingLevel);
      return true;
    }
    if (footerInstalled) ctx.ui.setFooter(undefined);
    return false;
  }

  ctx.ui?.setStatus?.(STATUS_KEY, text);
  return false;
}

export function clearFastStatus(
  ctx: StatusContext,
  footerInstalled = false,
): void {
  if (!canSetTuiStatus(ctx)) return;
  ctx.ui?.setStatus?.(STATUS_KEY, undefined);
  if (footerInstalled) ctx.ui?.setFooter?.(undefined);
}
