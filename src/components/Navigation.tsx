import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LineChart, Wallet, Settings } from "lucide-react";

const Navigation = () => {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-4">
      <Link href="/trades" className={cn(
        "flex items-center gap-2 px-4 py-2 hover:bg-accent rounded-lg",
        pathname === "/trades" && "bg-accent"
      )}>
        <LineChart className="h-4 w-4" />
        Trades
      </Link>
      <Link href="/portfolio" className={cn(
        "flex items-center gap-2 px-4 py-2 hover:bg-accent rounded-lg",
        pathname === "/portfolio" && "bg-accent"
      )}>
        <Wallet className="h-4 w-4" />
        Portfolio
      </Link>
      <Link href="/settings" className={cn(
        "flex items-center gap-2 px-4 py-2 hover:bg-accent rounded-lg",
        pathname === "/settings" && "bg-accent"
      )}>
        <Settings className="h-4 w-4" />
        Settings
      </Link>
    </div>
  );
};

export default Navigation; 