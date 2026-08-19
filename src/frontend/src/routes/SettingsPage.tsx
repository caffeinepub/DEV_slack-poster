import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useBackend } from "@/hooks/use-backend";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/** Slack bearer tokens start with xoxb- (bot) or xoxp- (user). */
const TOKEN_PATTERN = /^xox[bp]-[A-Za-z0-9-]+$/;

/** Human-readable summary of a backend SlackError variant. */
function describeError(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = (err as { message?: unknown }).message;
    if (typeof msg === "string" && msg.trim()) return msg;
  }
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code?: unknown }).code;
    if (typeof code === "string" && code.trim()) return code;
  }
  if (err instanceof Error && err.message) return err.message;
  return "Unexpected error from the canister.";
}

/**
 * Settings page — manage the signed-in user's Slack bearer token.
 *
 * The token is stored per-user in canister state (never in the browser) so it
 * persists across sessions without re-pasting. We never fetch or display the
 * raw token; `hasSlackToken` is enough to render the saved indicator.
 */
export function SettingsPage() {
  const { actor, isFetching } = useBackend();
  const queryClient = useQueryClient();

  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  // Read whether a token is already saved. We deliberately do NOT call
  // getSlackToken — the masked indicator is enough and avoids leaking the
  // secret into the DOM.
  const hasTokenQuery = useQuery({
    queryKey: ["slack", "has-token"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.hasSlackToken();
    },
    enabled: !!actor && !isFetching,
  });

  const tokenSaved: boolean = hasTokenQuery.data === true;
  const tokenLoading = hasTokenQuery.isLoading || isFetching;

  const saveMutation = useMutation({
    mutationFn: async (newToken: string) => {
      if (!actor) throw new Error("Backend actor is not ready.");
      await actor.saveSlackToken(newToken);
    },
    onSuccess: () => {
      toast.success("Slack token saved", {
        description: "Your token is stored securely in the canister.",
      });
      setToken("");
      setShowToken(false);
      void queryClient.invalidateQueries({ queryKey: ["slack", "has-token"] });
    },
    onError: (err) => {
      toast.error("Could not save token", { description: describeError(err) });
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Backend actor is not ready.");
      await actor.clearSlackToken();
    },
    onSuccess: () => {
      toast.success("Slack token cleared", {
        description: "No token is stored for your account.",
      });
      setToken("");
      void queryClient.invalidateQueries({ queryKey: ["slack", "has-token"] });
    },
    onError: (err) => {
      toast.error("Could not clear token", { description: describeError(err) });
    },
  });

  const trimmed = token.trim();
  const formatError =
    trimmed.length > 0 && !TOKEN_PATTERN.test(trimmed)
      ? "Tokens should start with xoxb- (bot) or xoxp- (user)."
      : null;
  const empty = trimmed.length === 0;
  const saving = saveMutation.isPending;
  const clearing = clearMutation.isPending;
  const busy = saving || clearing;
  const canSave = !empty && !formatError && !busy && !!actor;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSave) return;
    saveMutation.mutate(trimmed);
  }

  function handleClear() {
    clearMutation.mutate();
  }

  return (
    <section
      className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-12"
      data-ocid="settings.page"
    >
      <header className="mb-8" data-ocid="settings.header">
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-subtle"
            aria-hidden="true"
          >
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Slack Settings
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Connect your Slack workspace by saving a bearer token.
            </p>
          </div>
        </div>
      </header>

      {/* Status banner */}
      <div className="mb-6" data-ocid="settings.status">
        {tokenLoading ? (
          <div
            className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground"
            data-ocid="settings.status.loading"
          >
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Checking your saved token…</span>
          </div>
        ) : tokenSaved ? (
          <div
            className="flex items-center gap-3 rounded-lg border border-success/30 bg-success/10 px-4 py-3 text-sm text-foreground"
            data-ocid="settings.status.saved"
          >
            <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
            <span className="font-medium">Slack token saved</span>
            <span
              className="font-mono text-muted-foreground"
              aria-label="Token is masked"
            >
              ••••••••
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              Stored securely in the canister for your account.
            </span>
          </div>
        ) : (
          <div
            className="flex items-center gap-3 rounded-lg border border-border bg-secondary/60 px-4 py-3 text-sm text-muted-foreground"
            data-ocid="settings.status.empty"
          >
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <span>No Slack token saved yet. Paste one below to connect.</span>
          </div>
        )}
      </div>

      {/* Token form */}
      <Card data-ocid="settings.token_card">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            {tokenSaved ? "Update or replace token" : "Save your Slack token"}
          </CardTitle>
          <CardDescription>
            Paste a Slack bearer token ({"xoxb-…"} or {"xoxp-…"}). It is sent to
            the canister over the authenticated call and stored per your
            identity — never in the browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            <div className="grid gap-2">
              <Label htmlFor="slack-token" data-ocid="settings.token.label">
                Slack bearer token
              </Label>
              <div className="relative">
                <Input
                  id="slack-token"
                  name="slack-token"
                  type={showToken ? "text" : "password"}
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  placeholder="xoxb-••••••••••••••••••••••••"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  disabled={busy}
                  aria-invalid={formatError ? true : undefined}
                  aria-describedby="slack-token-help"
                  className={cn("pr-11 font-mono", formatError && "pr-11")}
                  data-ocid="settings.token.input"
                />
                <button
                  type="button"
                  onClick={() => setShowToken((s) => !s)}
                  disabled={busy}
                  className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center rounded-r-md text-muted-foreground transition-smooth hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label={showToken ? "Hide token" : "Show token"}
                  aria-pressed={showToken}
                  data-ocid="settings.token.toggle_visibility"
                >
                  {showToken ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              <p
                id="slack-token-help"
                className="text-xs text-muted-foreground"
                data-ocid="settings.token.help"
              >
                Stored per your Internet Identity account. You can update or
                clear it at any time.
              </p>
              {formatError && (
                <p
                  role="alert"
                  className="text-xs text-destructive"
                  data-ocid="settings.token.error"
                >
                  {formatError}
                </p>
              )}
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                type="submit"
                disabled={!canSave}
                className="sm:min-w-[8rem]"
                data-ocid="settings.token.save_button"
              >
                {saving ? (
                  <>
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    <span>Saving…</span>
                  </>
                ) : tokenSaved ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    <span>Update token</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="h-4 w-4" aria-hidden="true" />
                    <span>Save token</span>
                  </>
                )}
              </Button>

              {tokenSaved && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleClear}
                  disabled={busy}
                  className="sm:min-w-[8rem]"
                  data-ocid="settings.token.clear_button"
                >
                  {clearing ? (
                    <>
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                      <span>Clearing…</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                      <span>Clear token</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Guidance */}
      <Card className="mt-6" data-ocid="settings.guidance_card">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Where do I get a token?
          </CardTitle>
          <CardDescription>
            Slack bearer tokens are created from the Slack API admin pages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 text-sm text-muted-foreground">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                1
              </span>
              <span>
                Open{" "}
                <a
                  href="https://api.slack.com/apps"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  data-ocid="settings.guidance.apps_link"
                >
                  api.slack.com/apps
                  <ExternalLink
                    className="ml-1 inline h-3 w-3 align-baseline"
                    aria-hidden="true"
                  />
                </a>{" "}
                and create or select an app for your workspace.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                2
              </span>
              <span>
                Under{" "}
                <strong className="text-foreground">
                  OAuth &amp; Permissions
                </strong>
                , add the scopes you need (e.g.{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground">
                  chat:write
                </code>
                ,{" "}
                <code className="rounded bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground">
                  channels:read
                </code>
                ) and install the app to your workspace.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                3
              </span>
              <span>
                Copy the{" "}
                <strong className="text-foreground">
                  Bot User OAuth Token
                </strong>{" "}
                ({"xoxb-…"}) or{" "}
                <strong className="text-foreground">User OAuth Token</strong> (
                {"xoxp-…"}) and paste it above.
              </span>
            </li>
          </ol>

          <Alert className="mt-5" data-ocid="settings.guidance.security_alert">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Stored securely</AlertTitle>
            <AlertDescription>
              Your token is saved in canister state tied to your Internet
              Identity principal. It is never written to the browser and is only
              used to call Slack on your behalf.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </section>
  );
}
