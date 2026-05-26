import { useEffect, useState } from "react";

export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem("solestore_cookies")) setShow(true);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-3xl rounded-xl border border-border bg-card p-4 shadow-2xl md:flex md:items-center md:gap-4">
      <p className="text-sm text-muted-foreground">
        We use cookies to enhance your browsing experience and analyze traffic.
      </p>
      <div className="mt-3 flex gap-2 md:ml-auto md:mt-0">
        <button onClick={() => { localStorage.setItem("solestore_cookies", "declined"); setShow(false); }} className="rounded-md border border-border px-3 py-2 text-xs font-medium">Decline</button>
        <button onClick={() => { localStorage.setItem("solestore_cookies", "accepted"); setShow(false); }} className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">Accept</button>
      </div>
    </div>
  );
}
