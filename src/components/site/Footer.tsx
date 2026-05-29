import { Link } from "@tanstack/react-router";

// A simple footer component with site information, navigation links, and a newsletter signup form. 
export function Footer() {
  return (
    <footer className="mt-24 border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-4 lg:px-8">
        <div>
          <div className="text-xl font-extrabold tracking-tight">DTANK<span className="text-gold">KICKS</span></div>
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">Premium footwear curated for the everyday — from the gym floor to the city street.</p>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider">Shop</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li><Link to="/shop" search={{ category: "Sneakers" }} className="hover:text-foreground">Sneakers</Link></li>
            <li><Link to="/shop" search={{ category: "Boots" }} className="hover:text-foreground">Boots</Link></li>
            <li><Link to="/shop" search={{ category: "Sports" }} className="hover:text-foreground">Sports</Link></li>
            <li><Link to="/shop" search={{ category: "Formal" }} className="hover:text-foreground">Formal</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider">Help</h4>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>Shipping & Returns</li>
            <li>Size Guide</li>
            <li>Contact</li>
            <li>FAQ</li>
          </ul>
        </div>
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider">Newsletter</h4>
          <p className="mt-4 text-sm text-muted-foreground">10% off your first order.</p>
          <form className="mt-3 flex" onSubmit={(e) => e.preventDefault()}>
            <input type="email" required placeholder="Email address" className="h-10 flex-1 rounded-l-md border border-input bg-background px-3 text-sm outline-none focus:border-gold" />
            <button className="h-10 rounded-r-md bg-primary px-4 text-sm font-semibold text-primary-foreground">Join</button>
          </form>
        </div>
      </div>
      <div className="border-t border-border py-5 text-center text-xs text-muted-foreground">© {new Date().getFullYear()} SoleStore. All rights reserved.</div>
    </footer>
  );
}
