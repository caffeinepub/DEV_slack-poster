import { Toaster } from "@/components/ui/sonner";
import { router } from "@/routes/router";
import { useQueryClient } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

export default function App() {
  const queryClient = useQueryClient();
  return (
    <>
      <RouterProvider router={router} context={{ queryClient }} />
      <Toaster richColors position="top-center" />
    </>
  );
}
