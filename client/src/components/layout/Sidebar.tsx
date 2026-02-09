import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, Package, FileText, Settings, Users, PanelLeftOpen, PanelLeftClose, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;
  const [isExpanded, setIsExpanded] = useState(false);

  // Close sidebar on navigation
  useEffect(() => {
    setIsExpanded(false);
  }, [pathname]);

  const navItems = [
    { href: '/quotes', icon: Home, label: 'Dashboard' },
    { href: '/quotes/all', icon: FileText, label: 'All Quotes' },
    { href: '/quotes/customers', icon: Users, label: 'Customers' },
  ];

  const adminNavItems = [
    { href: '/quotes/products', icon: Package, label: 'Products' },
    { href: '/quotes/templates', icon: FileText, label: 'Templates' },
  ];

  const renderNavItem = (item: { href: string; icon: any; label: string }, isLink: boolean = true) => {
    const Icon = item.icon;
    const isActive = pathname === item.href;

    const content = (
      <div className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-slate-100',
        isActive && 'bg-white text-primary shadow-sm border border-slate-100',
        !isExpanded && 'justify-center px-2'
      )}>
        <Icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-primary" : "text-slate-500")} />
        {isExpanded && <span className="truncate text-sm font-medium">{item.label}</span>}
      </div>
    );

    if (!isExpanded) {
      return (
        <TooltipProvider key={item.label} delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              {isLink ? <Link href={item.href} className="w-full">{content}</Link> : <div className="w-full cursor-default">{content}</div>}
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium bg-slate-900 text-white border-0">
              {item.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return isLink ? (
      <Link key={item.label} href={item.href} className="w-full">
        {content}
      </Link>
    ) : (
      <div key={item.label} className="w-full">
        {content}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "hidden border-r bg-white/50 backdrop-blur-xl md:flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out border-slate-200 shadow-sm z-30",
        isExpanded ? "w-[260px]" : "w-[72px]"
      )}
    >
      <div className="flex h-10 items-center border-b border-slate-100 px-4 justify-between shrink-0">
        {isExpanded ? (
          <Link href="/quotes" className="flex items-center gap-2 font-bold text-lg text-slate-800 transition-opacity duration-300">
            <div className="bg-primary/10 p-1 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <span>Quotely</span>
          </Link>
        ) : (
          <Link href="/quotes" className="mx-auto">
            <div className="bg-primary/10 p-1 rounded-lg hover:bg-primary/20 transition-colors">
              <Package className="h-5 w-5 text-primary" />
            </div>
          </Link>
        )}

        {isExpanded && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(false)}
            className="h-8 w-8 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
        <nav className="space-y-1">
          {navItems.map((item) => renderNavItem(item))}
        </nav>

        {user?.role === 'ADMIN' && (
          <nav className="space-y-1">
            {isExpanded ? (
              <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Admin
              </div>
            ) : (
              <div className="h-px bg-slate-100 my-4 mx-2" />
            )}
            {adminNavItems.map((item) => renderNavItem(item))}
          </nav>
        )}
      </div>

      <div className="mt-auto p-3 border-t border-slate-100 bg-slate-50/50">
        {!isExpanded ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsExpanded(true)}
            className="w-full h-10 text-slate-500 hover:text-primary hover:bg-primary/5"
          >
            <PanelLeftOpen className="h-5 w-5" />
          </Button>
        ) : (
          renderNavItem({ href: '/quotes/settings', icon: Settings, label: 'Settings' })
        )}

        {!isExpanded && (
          <div className="mt-2">
            {renderNavItem({ href: '/quotes/settings', icon: Settings, label: 'Settings' })}
          </div>
        )}
      </div>
    </div>
  );
}
