import { Layout } from "@/components/Layout";
import { PostPage } from "@/routes/PostPage";
import { SettingsPage } from "@/routes/SettingsPage";
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";

const rootRoute = createRootRoute({
  component: () => (
    <Layout>
      <Outlet />
    </Layout>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: PostPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const routeTree = rootRoute.addChildren([indexRoute, settingsRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  defaultNotFoundComponent: () => (
    <div
      className="flex min-h-[40vh] flex-col items-center justify-center gap-2 text-center"
      data-ocid="not_found.page"
    >
      <h1 className="font-display text-2xl font-semibold text-foreground">
        Page not found
      </h1>
      <p className="text-muted-foreground">
        The page you’re looking for doesn’t exist.
      </p>
      <a
        href="/"
        className="mt-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
        data-ocid="not_found.home_link"
      >
        Back to Slack Poster
      </a>
    </div>
  ),
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
