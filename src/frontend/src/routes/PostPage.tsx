/**
 * Post page — compose and send a plain-text message to a Slack channel.
 *
 * Flow:
 *  1. Confirm a Slack token is saved (backend.hasSlackToken). If not, surface
 *     a clear empty state that routes the user to /settings.
 *  2. Fetch the user's channels (backend.listSlackChannels) and populate a
 *     dropdown. A refresh button re-fetches on demand.
 *  3. Compose the message in a textarea and post via backend.postSlackMessage.
 *  4. On success, toast + inline confirmation with the Slack timestamp; clear
 *     the textarea. On error, surface SlackError.message inline and via toast.
 */
import { useAuth } from "@/hooks/use-auth";
import { useBackend } from "@/hooks/use-backend";
import type {
  ListChannelsResult,
  PostMessageResult,
  SlackChannel,
  SlackError,
} from "@/types/slack";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Hash,
  Loader2,
  Lock,
  RefreshCw,
  Send,
  Users,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/** Maximum message length Slack accepts for chat.postMessage. */
const MAX_MESSAGE_LENGTH = 40000;

/** Heuristic: error codes that mean the token is missing or invalid. */
const TOKEN_ERROR_CODES = new Set([
  "missing_token",
  "invalid_token",
  "not_authed",
  "invalid_auth",
  "token_revoked",
  "account_inactive",
]);

/** True when a SlackError indicates the saved token is missing or unusable. */
function isTokenError(err: SlackError): boolean {
  return TOKEN_ERROR_CODES.has(err.code);
}

/** Format a Slack channel ts ("1234567890.012345") as a readable timestamp. */
function formatSlackTs(ts: string): string {
  const [secs] = ts.split(".");
  const n = Number(secs);
  if (!Number.isFinite(n) || n <= 0) return ts;
  return new Date(n * 1000).toLocaleString();
}

export function PostPage() {
  const { principal } = useAuth();
  const { actor, isFetching } = useBackend();
  const navigate = useNavigate();

  const [selectedChannelId, setSelectedChannelId] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [postError, setPostError] = useState<string | null>(null);
  const [lastPost, setLastPost] = useState<{
    channelName: string;
    ts: string;
  } | null>(null);

  // 1. Token presence — gates the whole page.
  const tokenQuery = useQuery({
    queryKey: ["slack", "has-token"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.hasSlackToken();
    },
    enabled: !!actor && !isFetching,
  });

  const hasToken = tokenQuery.data === true;
  const tokenChecked =
    !actor ||
    isFetching ||
    tokenQuery.isFetched ||
    tokenQuery.data !== undefined;

  // 2. Channel list — only when a token is present.
  const channelsQuery = useQuery({
    queryKey: ["slack", "channels"],
    queryFn: async (): Promise<ListChannelsResult> => {
      if (!actor) {
        return {
          __kind__: "err",
          err: {
            code: "actor_unavailable",
            message: "Backend actor is not ready.",
          },
        };
      }
      return actor.listSlackChannels();
    },
    enabled: !!actor && !isFetching && hasToken,
  });

  const channels: SlackChannel[] = useMemo(() => {
    const r = channelsQuery.data;
    if (!r || r.__kind__ !== "ok") return [];
    return r.ok;
  }, [channelsQuery.data]);

  const channelsError: SlackError | null = useMemo(() => {
    const r = channelsQuery.data;
    if (!r || r.__kind__ !== "ok") return r?.err ?? null;
    return null;
  }, [channelsQuery.data]);

  const selectedChannel = useMemo(
    () => channels.find((c) => c.id === selectedChannelId) ?? null,
    [channels, selectedChannelId],
  );

  const messageTrimmed = message.trim();
  const messageTooLong = message.length > MAX_MESSAGE_LENGTH;
  const canPost =
    hasToken &&
    !!selectedChannelId &&
    messageTrimmed.length > 0 &&
    !messageTooLong;

  // 3. Post mutation.
  const postMutation = useMutation({
    mutationFn: async ({
      channelId,
      text,
    }: {
      channelId: string;
      text: string;
    }): Promise<PostMessageResult> => {
      if (!actor) {
        return {
          __kind__: "err",
          err: {
            code: "actor_unavailable",
            message: "Backend actor is not ready.",
          },
        };
      }
      return actor.postSlackMessage(channelId, text);
    },
    onSuccess: (result, variables) => {
      if (result.__kind__ === "ok") {
        const ok = result.ok;
        if (ok.ok) {
          const channelName = selectedChannel?.name ?? variables.channelId;
          setLastPost({ channelName, ts: ok.ts });
          setPostError(null);
          setMessage("");
          toast.success("Message posted", {
            description: `Delivered to #${channelName}`,
          });
        } else {
          const msg =
            ok.error || "Slack accepted the request but reported an error.";
          setPostError(msg);
          toast.error("Post failed", { description: msg });
        }
      } else {
        const msg = result.err.message;
        setPostError(msg);
        if (isTokenError(result.err)) {
          toast.error("Slack token missing or invalid", {
            description: "Save your token in Settings to post.",
          });
        } else {
          toast.error("Post failed", { description: msg });
        }
      }
    },
    onError: (e) => {
      const msg =
        e instanceof Error ? e.message : "Unexpected error while posting.";
      setPostError(msg);
      toast.error("Post failed", { description: msg });
    },
  });

  const isPosting = postMutation.isPending;
  const isRefreshing = channelsQuery.isFetching && !channelsQuery.isLoading;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canPost || isPosting) return;
    setPostError(null);
    setLastPost(null);
    postMutation.mutate({ channelId: selectedChannelId, text: messageTrimmed });
  }

  function handleRefreshChannels() {
    setPostError(null);
    channelsQuery.refetch();
  }

  function goToSettings() {
    navigate({ to: "/settings" });
  }

  // --- Loading: actor or token check still in flight ---
  if (!tokenChecked) {
    return (
      <section
        className="mx-auto w-full max-w-3xl px-6 py-12"
        data-ocid="post.page"
      >
        <PostHeader />
        <div
          className="flex min-h-[16rem] flex-col items-center justify-center gap-3 rounded-xl border border-border bg-card text-center"
          data-ocid="post.loading_state"
        >
          <Loader2
            className="h-5 w-5 animate-spin text-primary"
            aria-hidden="true"
          />
          <p className="text-sm text-muted-foreground">
            Checking your Slack connection…
          </p>
        </div>
      </section>
    );
  }

  // --- No token: direct the user to Settings ---
  if (!hasToken) {
    return (
      <section
        className="mx-auto w-full max-w-3xl px-6 py-12"
        data-ocid="post.page"
      >
        <PostHeader />
        <Card className="border-dashed" data-ocid="post.no_token_card">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <span
              className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-secondary-foreground"
              aria-hidden="true"
            >
              <Lock className="h-6 w-6" />
            </span>
            <div className="space-y-1.5">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Connect your Slack workspace
              </h2>
              <p className="mx-auto max-w-md text-sm text-muted-foreground">
                You need to save a Slack bot or user token before you can list
                channels and post messages. Add one in Settings.
              </p>
            </div>
            <Button
              onClick={goToSettings}
              data-ocid="post.go_to_settings_button"
            >
              Go to Settings
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </CardContent>
        </Card>
      </section>
    );
  }

  // --- Token present but channel list returned a token-related error ---
  const tokenErrorFromChannels =
    channelsError !== null && isTokenError(channelsError);

  return (
    <section
      className="mx-auto w-full max-w-3xl px-6 py-12"
      data-ocid="post.page"
    >
      <PostHeader principal={principal?.toText() ?? null} />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Channel selection */}
        <Card data-ocid="post.channel_card">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="font-display text-base">Channel</CardTitle>
              <CardDescription>
                Pick a channel from your Slack workspace to post to.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefreshChannels}
              disabled={isRefreshing || channelsQuery.isLoading}
              aria-label="Refresh channel list"
              data-ocid="post.refresh_channels_button"
            >
              <RefreshCw
                className={isRefreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label
                htmlFor="post-channel-select"
                data-ocid="post.channel_label"
              >
                Destination channel
              </Label>

              {channelsQuery.isLoading ? (
                <div
                  className="flex h-9 items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm text-muted-foreground"
                  data-ocid="post.channel_loading_state"
                >
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Loading channels…
                </div>
              ) : tokenErrorFromChannels ? (
                <div
                  className="flex flex-col gap-3 rounded-md border border-dashed border-border bg-secondary/40 p-4"
                  data-ocid="post.token_error_state"
                >
                  <Alert
                    variant="destructive"
                    className="border-destructive/30"
                  >
                    <AlertCircle className="h-4 w-4" aria-hidden="true" />
                    <AlertTitle>Slack token missing or invalid</AlertTitle>
                    <AlertDescription>
                      {channelsError?.message ??
                        "Your saved token was rejected by Slack."}
                    </AlertDescription>
                  </Alert>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={goToSettings}
                    className="w-fit"
                    data-ocid="post.token_error_settings_button"
                  >
                    Go to Settings
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </div>
              ) : channelsError !== null ? (
                <Alert
                  variant="destructive"
                  data-ocid="post.channel_error_state"
                >
                  <AlertCircle className="h-4 w-4" aria-hidden="true" />
                  <AlertTitle>Couldn’t load channels</AlertTitle>
                  <AlertDescription>
                    {channelsError.message}
                    <span className="mt-2 block">
                      <button
                        type="button"
                        onClick={handleRefreshChannels}
                        className="font-medium text-destructive underline-offset-4 hover:underline"
                        data-ocid="post.channel_error_retry_button"
                      >
                        Try again
                      </button>
                    </span>
                  </AlertDescription>
                </Alert>
              ) : channels.length === 0 ? (
                <div
                  className="flex flex-col items-start gap-2 rounded-md border border-dashed border-border bg-secondary/30 p-4"
                  data-ocid="post.channel_empty_state"
                >
                  <p className="text-sm font-medium text-foreground">
                    No channels available
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Your token didn’t return any channels. Join a channel in
                    Slack or refresh the list.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshChannels}
                    className="mt-1"
                    data-ocid="post.channel_empty_refresh_button"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Refresh channels
                  </Button>
                </div>
              ) : (
                <Select
                  value={selectedChannelId}
                  onValueChange={(v) => {
                    setSelectedChannelId(v);
                    setPostError(null);
                  }}
                >
                  <SelectTrigger
                    id="post-channel-select"
                    className="w-full"
                    aria-label="Destination channel"
                    data-ocid="post.channel_select"
                  >
                    <SelectValue placeholder="Select a channel" />
                  </SelectTrigger>
                  <SelectContent data-ocid="post.channel_select_content">
                    <SelectGroup>
                      <SelectLabel>Channels</SelectLabel>
                      {channels.map((c, i) => (
                        <SelectItem
                          key={c.id}
                          value={c.id}
                          disabled={c.isArchived}
                          data-ocid={`post.channel_item.${i}`}
                        >
                          <span className="flex items-center gap-2">
                            <Hash
                              className="h-3.5 w-3.5 text-muted-foreground"
                              aria-hidden="true"
                            />
                            <span className="font-medium">{c.name}</span>
                            {c.isArchived && (
                              <Badge
                                variant="secondary"
                                className="ml-1 text-[10px]"
                              >
                                archived
                              </Badge>
                            )}
                            {c.isPrivate && (
                              <Badge
                                variant="outline"
                                className="ml-1 text-[10px]"
                              >
                                private
                              </Badge>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            </div>

            {selectedChannel && (
              <div
                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground"
                data-ocid="post.channel_meta"
              >
                <span className="flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="font-mono">{selectedChannel.id}</span>
                </span>
                {typeof selectedChannel.numMembers === "bigint" && (
                  <span className="flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    {selectedChannel.numMembers.toString()} members
                  </span>
                )}
                {selectedChannel.isPrivate && <span>Private channel</span>}
                {selectedChannel.isArchived && (
                  <span>Archived — posting is disabled</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Message composer */}
        <Card data-ocid="post.message_card">
          <CardHeader>
            <CardTitle className="font-display text-base">Message</CardTitle>
            <CardDescription>
              Plain text only. Markdown isn’t supported in this version.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label
                htmlFor="post-message-textarea"
                data-ocid="post.message_label"
              >
                Message text
              </Label>
              <Textarea
                id="post-message-textarea"
                value={message}
                onChange={(e) => {
                  setMessage(e.target.value);
                  if (postError) setPostError(null);
                }}
                placeholder="Type your message to the channel…"
                rows={6}
                aria-invalid={messageTooLong}
                disabled={isPosting}
                data-ocid="post.message_textarea"
              />
              <div className="flex items-center justify-between text-xs">
                <span
                  className={
                    messageTooLong
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }
                  data-ocid="post.message_count"
                >
                  {message.length.toLocaleString()} /{" "}
                  {MAX_MESSAGE_LENGTH.toLocaleString()}
                </span>
                {messageTooLong && (
                  <span
                    className="text-destructive"
                    data-ocid="post.message_too_long"
                  >
                    Message exceeds Slack’s limit
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inline post error */}
        {postError && (
          <Alert variant="destructive" data-ocid="post.post_error_state">
            <AlertCircle className="h-4 w-4" aria-hidden="true" />
            <AlertTitle>Couldn’t post your message</AlertTitle>
            <AlertDescription>{postError}</AlertDescription>
          </Alert>
        )}

        {/* Success confirmation */}
        <AnimatePresence initial={false}>
          {lastPost && !postError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              <Alert
                className="border-success/30 bg-success/5 text-foreground"
                data-ocid="post.post_success_state"
              >
                <CheckCircle2
                  className="h-4 w-4 text-success"
                  aria-hidden="true"
                />
                <AlertTitle className="text-foreground">
                  Message posted
                </AlertTitle>
                <AlertDescription>
                  Delivered to{" "}
                  <span className="font-medium">#{lastPost.channelName}</span>
                  <span className="mx-1.5 text-muted-foreground">·</span>
                  <span className="font-mono text-xs">
                    {formatSlackTs(lastPost.ts)}
                  </span>
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setMessage("");
              setPostError(null);
              setLastPost(null);
            }}
            disabled={isPosting || message.length === 0}
            data-ocid="post.clear_button"
          >
            Clear
          </Button>
          <Button
            type="submit"
            disabled={!canPost || isPosting}
            className="bg-gradient-primary text-primary-foreground shadow-subtle hover:opacity-90 sm:min-w-[10rem]"
            data-ocid="post.submit_button"
          >
            {isPosting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Posting…
              </>
            ) : (
              <>
                <Send className="h-4 w-4" aria-hidden="true" />
                Post message
              </>
            )}
          </Button>
        </div>
      </form>
    </section>
  );
}

/** Page header — title, description, optional principal chip. */
function PostHeader({ principal }: { principal?: string | null }) {
  return (
    <header className="mb-6" data-ocid="post.header">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground">
        Post a message
      </h1>
      <p className="mt-2 text-muted-foreground">
        Compose and send a plain-text message to a Slack channel.
      </p>
      {principal && (
        <p
          className="mt-2 font-mono text-xs text-muted-foreground"
          data-ocid="post.principal"
        >
          Signed in as {principal.slice(0, 8)}…{principal.slice(-4)}
        </p>
      )}
    </header>
  );
}
