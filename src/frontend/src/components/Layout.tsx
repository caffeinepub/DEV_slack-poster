import { useAuth } from "@/hooks/use-auth";
import { useBackend } from "@/hooks/use-backend";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "@tanstack/react-router";
import {
  Loader2,
  LogOut,
  MessageSquare,
  Settings as SettingsIcon,
} from "lucide-react";
import type { PropsWithChildren } from "react";

/** Truncate a principal string to a readable short form. */
function shortPrincipal(principal: string): string {
  if (principal.length <= 12) return principal;
  return `${principal.slice(0, 6)}…${principal.slice(-4)}`;
}

/** Top navigation bar — app name, nav links, signed-in identity, sign-out. */
function TopNav() {
  const { principal, signOut, isSignedIn } = useAuth();
  const location = useLocation();
  const principalText = principal ? shortPrincipal(principal.toText()) : "";

  const navItems = [
    { to: "/", label: "Post", icon: MessageSquare, ocid: "nav.post_link" },
    {
      to: "/settings",
      label: "Settings",
      icon: SettingsIcon,
      ocid: "nav.settings_link",
    },
  ];

  return (
    <header
      className="sticky top-0 z-40 border-b border-border bg-card/95 shadow-subtle backdrop-blur supports-[backdrop-filter]:bg-card/80"
      data-ocid="nav.header"
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        {/* Brand */}
        <a
          href="/"
          className="flex items-center gap-2.5 rounded-md font-display text-lg font-semibold tracking-tight text-foreground transition-smooth hover:text-primary"
          data-ocid="nav.brand_link"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-primary text-primary-foreground shadow-subtle"
            aria-hidden="true"
          >
            <MessageSquare className="h-4 w-4" />
          </span>
          <span>Slack Poster</span>
        </a>

        {/* Nav links */}
        <nav
          className="ml-2 flex items-center gap-1"
          aria-label="Primary"
          data-ocid="nav.primary"
        >
          {navItems.map((item) => {
            const active =
              item.to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.to);
            const Icon = item.icon;
            return (
              <a
                key={item.to}
                href={item.to}
                aria-current={active ? "page" : undefined}
                className={[
                  "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-smooth",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                ].join(" ")}
                data-ocid={item.ocid}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">{item.label}</span>
              </a>
            );
          })}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Identity + sign-out */}
        {isSignedIn && principalText && (
          <div className="flex items-center gap-3">
            <div
              className="hidden items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 sm:flex"
              data-ocid="nav.identity"
            >
              <span
                className="h-2 w-2 rounded-full bg-success"
                aria-hidden="true"
              />
              <span className="font-mono text-xs text-muted-foreground">
                {principalText}
              </span>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-smooth hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              aria-label="Sign out"
              data-ocid="nav.sign_out_button"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

/** Sign-in screen shown when the user is not authenticated. */
function SignInScreen() {
  const { signIn, isInitializing, isLoggingIn, isLoginError, loginError } =
    useAuth();

  const busy = isInitializing || isLoggingIn;

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-gradient-subtle px-6"
      data-ocid="auth.signin_page"
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-elevated"
        data-ocid="auth.signin_card"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-subtle"
            aria-hidden="true"
          >
            <MessageSquare className="h-6 w-6" />
          </span>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">
            Sign in to Slack Poster
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Authenticate with Internet Identity to manage your Slack workspace
            and post messages.
          </p>
        </div>

        {isLoginError && loginError && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
            data-ocid="auth.signin_error"
          >
            {loginError.message}
          </div>
        )}

        <button
          type="button"
          onClick={() => signIn()}
          disabled={busy}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-gradient-primary text-sm font-semibold text-primary-foreground shadow-subtle transition-smooth hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
          data-ocid="auth.signin_button"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>Connecting…</span>
            </>
          ) : (
            <span>Sign in with Internet Identity</span>
          )}
        </button>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Your identity stays on your device. We never see your Internet
          Identity credentials.
        </p>
      </div>
    </main>
  );
}

/** Initializing splash shown while the auth client restores a session. */
function InitializingScreen() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center bg-background"
      data-ocid="auth.initializing"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2
          className="h-6 w-6 animate-spin text-primary"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">Restoring your session…</p>
      </div>
    </main>
  );
}

/**
 * Layout — the application shell.
 *
 * Gates the entire app behind Internet Identity: while the auth client is
 * initializing we show a splash; once ready, unauthenticated users see the
 * sign-in screen; authenticated users see the top nav + routed page content.
 *
 * Also pre-warms the backend actor (and the caller’s admin status) so page
 * tasks can read it without an extra loading hop.
 */
export function Layout({ children }: PropsWithChildren) {
  const { isSignedIn, isInitializing } = useAuth();
  const { actor, isFetching } = useBackend();

  // Pre-warm admin status for the signed-in user so the Settings nav link can
  // be gated. Page tasks will re-query this through their own hooks.
  useQuery({
    queryKey: ["caller-role"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching && isSignedIn,
  });

  if (isInitializing) {
    return <InitializingScreen />;
  }

  if (!isSignedIn) {
    return <SignInScreen />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <TopNav />
      <div className="flex-1">{children}</div>
      <footer
        className="border-t border-border bg-card px-4 py-6 text-center"
        data-ocid="layout.footer"
      >
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(
            typeof window !== "undefined" ? window.location.hostname : "",
          )}`}
          className="text-xs text-muted-foreground transition-smooth hover:text-foreground"
          target="_blank"
          rel="noreferrer"
          data-ocid="layout.footer_link"
        >
          © {new Date().getFullYear()}. Built with love using caffeine.ai
        </a>
      </footer>
    </div>
  );
}
