
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Home, Package, FileText, Settings, Users, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user;

  const navItems = [
    { href: '/quotes', icon: Home, label: 'Dashboard' },
    { href: '/quotes/all', icon: FileText, label: 'All Quotes' },
    { href: '/quotes/customers', icon: Users, label: 'Customers' },
  ];

  const adminNavItems = [
    { href: '/quotes/products', icon: Package, label: 'Products' },
    { href: '/quotes/templates', icon: FileText, label: 'PDF Templates' },
  ];

  return (
    <div className="hidden border-r bg-muted/40 md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-10 items-center border-b px-4 lg:px-6">
          <Link href="/quotes" className="flex items-center gap-2 font-semibold">
            <Package className="h-6 w-6" />
            <span className="">Quotely</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                  { 'bg-muted text-primary': pathname === href }
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
            {user?.role === 'ADMIN' && (
              <>
                <div className="my-2 border-t border-border/60" />
                <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase">
                  Admin
                </h3>
                {adminNavItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    target={(item as any).target}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                      { 'bg-muted text-primary': pathname === item.href }
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </>
            )}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <Link
            href="/quotes/settings"
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
              { 'bg-muted text-primary': pathname === "/quotes/settings" }
            )}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>
    </div>
  );
}
