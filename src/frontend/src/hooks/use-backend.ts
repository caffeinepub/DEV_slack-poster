import { createActor } from "@/backend";
import type { Backend } from "@/backend";
import { useActor } from "@caffeineai/core-infrastructure";

/**
 * Backend hook — returns the typed canister actor for the signed-in identity.
 *
 * The actor is created lazily by `useActor` once an authenticated identity is
 * available, and is `null` while the user is signed out or the actor is being
 * fetched. Callers must guard against `actor === null` before invoking methods.
 */
export function useBackend(): {
  actor: Backend | null;
  isFetching: boolean;
} {
  return useActor<Backend>(createActor);
}
