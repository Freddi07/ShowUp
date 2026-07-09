import { Link, useLocation } from "wouter";
import { useSession, signOut } from "@/lib/auth-client";
import { 
  LayoutDashboard, 
  Users, 
  MessageSquareShare, 
  Sparkles, 
  Bell, 
  Settings, 
  LogOut,
  Menu
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";

interface ShellProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Oversikt", icon: LayoutDashboard },
  { href: "/konkurrenter", label: "Konkurrenter", icon: Users },
  { href: "/markedsforing", label: "Markedsføring", icon: MessageSquareShare },
  { href: "/ai-chat", label: "AI-assistent", icon: Sparkles },
  { href: "/varsler", label: "Varsler", icon: Bell },
  { href: "/innstillinger", label: "Innstillinger", icon: Settings },
];

export function Shell({ children }: ShellProps) {
  const [location] = useLocation();
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
  };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <div className="flex flex-col gap-1 w-full">
      {navItems.map((item) => {
        const isActive = location.startsWith(item.href);
        return (
          <Link key={item.href} href={item.href} onClick={onClick}>
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-black/5"
              )}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-30">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-lg">
            L
          </div>
          <span className="font-semibold text-foreground tracking-tight">LokalRadar</span>
        </div>
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[280px] p-0 flex flex-col bg-card border-r-0">
            <SheetHeader className="p-6 border-b text-left">
              <SheetTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-lg">
                  L
                </div>
                <span className="font-semibold text-foreground tracking-tight">LokalRadar</span>
              </SheetTitle>
            </SheetHeader>
            <div className="p-4 flex-1">
              <NavLinks onClick={() => setIsMobileMenuOpen(false)} />
            </div>
            <div className="p-4 border-t">
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                  {session?.user?.name?.charAt(0).toUpperCase() || "U"}
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium leading-none">{session?.user?.name || "Bruker"}</span>
                  <span className="text-xs text-muted-foreground mt-1 truncate w-40">{session?.user?.email}</span>
                </div>
              </div>
              <Button variant="outline" className="w-full justify-start text-muted-foreground" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Logg ut
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r bg-card h-screen sticky top-0 shrink-0">
        <div className="p-6">
          <Link href="/dashboard" className="flex items-center gap-3 cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-serif font-bold text-xl shadow-sm">
              L
            </div>
            <span className="font-bold text-xl text-foreground tracking-tight">LokalRadar</span>
          </Link>
        </div>
        
        <div className="px-4 py-2 flex-1">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-3">Meny</h3>
          <NavLinks />
        </div>

        <div className="p-4 mt-auto border-t">
          <div className="flex items-center gap-3 mb-4 px-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
              {session?.user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium leading-none truncate">{session?.user?.name || "Bruker"}</span>
              <span className="text-xs text-muted-foreground mt-1 truncate">{session?.user?.email}</span>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={handleSignOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Logg ut
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 max-w-full">
        {children}
      </main>
    </div>
  );
}
