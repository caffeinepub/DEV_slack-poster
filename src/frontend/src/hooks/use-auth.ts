import { useInternetIdentity } from "@caffeineai/core-infrastructure";
import { useMemo } from "react";

/**
 * Auth hook — thin wrapper around the InternetIdentityProvider context.
 *
 * Exposes the signed-in identity, principal, sign-in / sign-out actions, and
 * status flags. The identity provider URL is injected by the template from the
 * deployment environment (II_URL), so we never hardcode one here.
 */
export function useAuth() {
  const {
    identity,
    isAuthenticated,
    isInitializing,
    isLoggingIn,
    isLoginError,
    loginError,
    login,
    clear,
  } = useInternetIdentity();

  const principal = useMemo(() => identity?.getPrincipal() ?? null, [identity]);

  return {
    identity,
    principal,
    isSignedIn: isAuthenticated,
    isInitializing,
    isLoggingIn,
    isLoginError,
    loginError,
    signIn: login,
    signOut: clear,
  };
}
