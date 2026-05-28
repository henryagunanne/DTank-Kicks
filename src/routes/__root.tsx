/*
  This file defines the root route for the application, which includes the main layout and error handling.
  It uses TanStack Router's createRootRouteWithContext to set up a route that provides a QueryClient context for React Query.
  The RootShell component defines the HTML structure, while the RootComponent sets up providers and the main layout.
  NotFoundComponent and ErrorComponent handle 404 and other errors respectively.
*/

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { CartProvider } from "@/lib/cart-context";
import { ThemeProvider } from "@/lib/theme-context";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BackToTop } from "@/components/site/BackToTop";
import { CookieBanner } from "@/components/site/CookieBanner";


/*  The NotFoundComponent and ErrorComponent are simple components that display messages when a route is not found or when an error occurs.
    The NotFoundComponent shows a 404 message with a shoe emoji, while the ErrorComponent logs the error and provides a button to retry.
*/
function NotFoundComponent() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="text-center">
        <div className="text-7xl">👟</div>
        <h1 className="mt-4 text-5xl font-extrabold tracking-tight">404</h1>
        <p className="mt-2 text-muted-foreground">This shoe walked out the door.</p>
        <a href="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground">Go Home</a>
      </div>
    </div>
  );
}

/*  The ErrorComponent is used to display a generic error message when something goes wrong in the application.
    It logs the error to the console for debugging purposes and provides a button for the user to retry the action that caused the error.
*/
function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 text-center">
      <div>
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">Please try again.</p>
        <button onClick={() => { router.invalidate(); reset(); }} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Try again</button>
      </div>
    </div>
  );
}

/*  The Route is created using createRootRouteWithContext, which allows us to provide a context (in this case, a QueryClient for React Query) to all child routes.
    The head function sets up meta tags and links for stylesheets and fonts.
    The shellComponent is the RootShell, which defines the HTML structure, while the component is the RootComponent, which sets up providers and the main layout.
    NotFoundComponent and ErrorComponent are specified for handling 404 and other errors.
*/
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "DTank-Kicks — Premium Footwear" },
      { name: "description", content: "Premium shoes for sport, street, and everything in between. Free shipping over ₱2,000." },
      { property: "og:title", content: "DTank-Kicks — Premium Footwear" },
      { property: "og:description", content: "Premium shoes for sport, street, and everything in between." },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});


/*  The RootShell component defines the basic HTML structure of the application, including the <html>, <head>, and <body> tags.
    It uses the HeadContent and Scripts components from TanStack Router to manage the document head and include necessary scripts.
*/
function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

/*  The RootComponent is the main layout component for the application. It wraps the entire app in various providers, 
    including QueryClientProvider for React Query, ThemeProvider for theming, AuthProvider for authentication, and CartProvider for shopping cart state.
    It also includes the Header and Footer components, as well as a BackToTop button, CookieBanner, and Toaster for notifications.
    The Outlet component is where the child routes will be rendered.
*/
function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AuthGate>  
            <CartProvider>
              <div className="flex min-h-screen flex-col">
                <Header />
                <main className="flex-1"><Outlet /></main>
                <Footer />
                <BackToTop />
                <CookieBanner />
                <Toaster position="top-right" richColors />
              </div>
            </CartProvider>
          </AuthGate>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}


/*  The AuthGate component is a simple wrapper that checks if the authentication state is still loading. 
    If it is, it displays a loading message. Once the loading is complete, it renders the children components.
    This ensures that the app doesn't render before we know if the user is logged in or not, 
    preventing potential flashes of unauthenticated content.
*/
function AuthGate({ children }: { children: ReactNode }) {
  const { loading } = useAuth();
  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-muted-foreground text-sm">Loading...</div>
    </div>
  );
  return <>{children}</>;
}