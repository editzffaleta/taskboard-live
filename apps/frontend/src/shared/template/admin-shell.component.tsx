'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LogOut, Menu, UserRound } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { Sheet, SheetContent } from '@/shared/components/ui/sheet';
import { Separator } from '@/shared/components/ui/separator';
import { useShell } from '@/shared/hooks/shell.hook';
import { cn } from '@/shared/lib/class-name.util';
import { ThemeToggle } from '@/shared/components/theme/theme-toggle.component';
import Image from 'next/image';

type AdminShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
  logoIcon?: ReactNode;
  logoText?: ReactNode;
  logoHref?: string;
  userName?: string;
  userEmail?: string;
  userAvatarUrl?: string | null;
  profileHref?: string;
  onLogout?: () => void;
};

export function AdminShell({
  sidebar,
  children,
  logoHref = '/dashboard',
  userName = 'Usuario',
  userEmail = 'usuario@aplicacao.local',
  userAvatarUrl,
  profileHref = '/auth/profile',
  onLogout,
}: AdminShellProps) {
  const router = useRouter();
  const { isSidebarOpen, isMobile, setSidebarOpen, toggleSidebar } = useShell();
  const collapsed = !isMobile && !isSidebarOpen;
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);
  const resolvedAvatarUrl = userAvatarUrl && failedAvatarUrl !== userAvatarUrl ? userAvatarUrl : null;

  void logoHref;

  return (
    <div className="h-screen overflow-hidden bg-background text-foreground">
      <div className="flex h-full">
        <aside
          className={cn(
            'relative hidden h-screen shrink-0 overflow-hidden border-r border-border bg-card shadow-[inset_0_1px_0_rgba(255,255,255,0.07)] lg:flex lg:flex-col',
            collapsed ? 'w-18' : 'w-84 xl:w-88',
          )}
        >
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">{sidebar}</div>
          </div>
        </aside>

        <Sheet open={isMobile && isSidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent
          side="left"
          className="w-[22rem] max-w-[95vw] overflow-hidden border-border bg-card p-0 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
        >
            <div className="relative flex h-full min-h-0 flex-col">
              <div className="min-h-0 flex-1 overflow-y-auto">{sidebar}</div>
            </div>
          </SheetContent>
        </Sheet>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
          <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-xl md:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Alternar menu lateral">
                <Menu className="size-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-auto gap-2 px-2.5 py-1.5">
                    {resolvedAvatarUrl ? (
                      <Image
                        src={resolvedAvatarUrl}
                        alt={`Avatar de ${userName}`}
                        className="size-8 rounded-full border border-border object-cover"
                        onError={() => setFailedAvatarUrl(userAvatarUrl ?? null)}
                        width={32}
                        height={32}
                      />
                    ) : (
                      <span className="flex size-8 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
                        <UserRound className="size-4" />
                      </span>
                    )}

                    <span className="hidden min-w-0 flex-col items-start text-left md:flex">
                      <span className="max-w-35 truncate text-sm leading-4">{userName}</span>
                      <span className="max-w-35 truncate text-xs text-muted-foreground">{userEmail}</span>
                    </span>
                    <ChevronDown className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <div className="px-2 py-2">
                    <p className="truncate text-sm font-medium">{userName}</p>
                    <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                  </div>
                  <Separator className="my-1" />
                  <DropdownMenuItem onSelect={() => router.push(profileHref)}>
                    <UserRound className="mr-2 size-4" />
                    Perfil
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={onLogout} className="text-destructive focus:bg-destructive/10 focus:text-destructive">
                    <LogOut className="mr-2 size-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="relative min-h-0 flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
