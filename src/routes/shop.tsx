import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/shop")({
  component: ShopLayout,
});

function ShopLayout() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* shared UI like filters wrapper, header, etc */}
      <Outlet />
    </div>
  );
}