/**
 * Shared Slack types — re-exported from the generated backend bindings so page
 * tasks import a single, stable surface instead of reaching into `@/backend`.
 *
 * These mirror the Candid types declared in `backend.d.ts` / `backend.ts`.
 */
export type {
  SlackChannel,
  SlackPostResult,
  SlackError,
  ListChannelsResult,
  PostMessageResult,
} from "@/backend";

export type { UserRole } from "@/backend";
