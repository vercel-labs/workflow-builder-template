"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/workflows/user-menu";

interface AppHeaderProps {
  title?: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  actions?: React.ReactNode;
  disableTitleLink?: boolean;
  useMobileTwoLineLayout?: boolean;
}

export function AppHeader({
  title = "Workflow Builder",
  showBackButton,
  onBack,
  actions,
  disableTitleLink = false,
  useMobileTwoLineLayout = false,
}: AppHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.push("/");
    }
  };

  // Two-line mobile layout (for workflow page)
  if (useMobileTwoLineLayout) {
    return (
      <header className="border-b px-4 py-3 md:px-6 md:py-4">
        {/* Mobile: Two-line layout */}
        <div className="flex flex-col gap-2 md:hidden">
          {/* First line: Back button + Title + Avatar */}
          <div className="flex items-center gap-2">
            {showBackButton && (
              <Button
                onClick={handleBack}
                size="icon"
                title="Back to workflows"
                variant="ghost"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {disableTitleLink ? (
              <div className="min-w-0 flex-1 truncate font-semibold text-lg">
                {title}
              </div>
            ) : (
              <Link
                className="min-w-0 flex-1 transition-opacity hover:opacity-80"
                href="/"
              >
                <h1 className="truncate font-semibold text-lg">{title}</h1>
              </Link>
            )}
            <UserMenu />
          </div>
          {/* Second line: Actions */}
          <div className="flex items-center gap-1">{actions}</div>
        </div>

        {/* Desktop: Single line layout */}
        <div className="hidden items-center justify-between md:flex">
          <div className="flex items-center gap-2">
            {showBackButton && (
              <Button
                onClick={handleBack}
                size="icon"
                title="Back to workflows"
                variant="ghost"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            {disableTitleLink ? (
              <div className="font-semibold text-xl">{title}</div>
            ) : (
              <Link className="transition-opacity hover:opacity-80" href="/">
                <h1 className="font-semibold text-xl">{title}</h1>
              </Link>
            )}
          </div>
          <div className="flex items-center gap-2">
            {actions}
            <UserMenu />
          </div>
        </div>
      </header>
    );
  }

  // Standard single-line layout (for all other pages)
  return (
    <header className="border-b px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <Button
              onClick={handleBack}
              size="icon"
              title="Back to workflows"
              variant="ghost"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          {disableTitleLink ? (
            <div className="font-semibold text-xl">{title}</div>
          ) : (
            <Link className="transition-opacity hover:opacity-80" href="/">
              <h1 className="font-semibold text-xl">{title}</h1>
            </Link>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
