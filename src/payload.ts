import {
  DEFAULT_SERVICE_TIER,
  SUPPORTED_PROVIDERS,
  type FastModeConfig,
  type FastTarget,
  type ModelRef,
} from "./types";

const SUPPORTED_PROVIDER_SET = new Set<string>(SUPPORTED_PROVIDERS);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function toModelRef(model: unknown): ModelRef | undefined {
  if (!isRecord(model)) return undefined;

  const { provider, id } = model;
  if (typeof provider !== "string" || typeof id !== "string") return undefined;
  if (!provider || !id) return undefined;

  return { provider, id };
}

export function isSupportedProvider(provider: string): boolean {
  return SUPPORTED_PROVIDER_SET.has(provider);
}

export function findMatchingTarget(
  model: ModelRef | undefined,
  targets: FastTarget[],
): FastTarget | undefined {
  if (!model || !isSupportedProvider(model.provider)) return undefined;

  const modelId =
    model.provider === "plexus" && model.id.endsWith("-fast")
      ? model.id.slice(0, -"-fast".length)
      : model.id;

  return targets.find(
    (target) =>
      target.provider === model.provider &&
      isSupportedProvider(target.provider) &&
      (target.model.endsWith("*")
        ? modelId.startsWith(target.model.slice(0, -1))
        : target.model === modelId),
  );
}

export function applyFastModePayload(
  payload: unknown,
  serviceTier: string,
  model?: ModelRef,
): unknown | undefined {
  if (!isRecord(payload)) return undefined;

  if (model?.provider === "plexus") {
    const baseModel = model.id.endsWith("-fast")
      ? model.id.slice(0, -"-fast".length)
      : model.id;
    return { ...payload, model: `${baseModel}-fast` };
  }

  return {
    ...payload,
    service_tier: serviceTier || DEFAULT_SERVICE_TIER,
  };
}

export function getFastModePayload(
  config: FastModeConfig,
  model: ModelRef | undefined,
  payload: unknown,
): unknown | undefined {
  if (!config.enabled) return undefined;

  const target = findMatchingTarget(model, config.targets);
  if (!target) return undefined;

  return applyFastModePayload(
    payload,
    target.serviceTier ?? DEFAULT_SERVICE_TIER,
    model,
  );
}
