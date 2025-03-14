'use client'

import { usePortfolio } from '@/lib/context/PortfolioContext'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useToast } from '@/components/ui/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from '@/components/ui/button'
import { ChevronDown, Plus } from 'lucide-react'
import NewPortfolioDialog from "../trades/NewPortfolioDialog"
import { Portfolio } from '@/lib/types'

export default function GlobalPortfolioSelector() {
  const { selectedPortfolio, portfolios, setSelectedPortfolio, refreshPortfolios, isLoading } = usePortfolio()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  if (isLoading) {
    return (
      <Button variant="outline" className="w-[240px] justify-between" disabled>
        Loading portfolios...
        <ChevronDown className="ml-2 h-4 w-4" />
      </Button>
    )
  }

  const handlePortfolioCreated = async () => {
    await refreshPortfolios()
  }

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-[240px] justify-between">
            {selectedPortfolio ? selectedPortfolio.name : "Select Portfolio"}
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[240px]">
          {portfolios.length > 0 ? (
            <>
              {portfolios.map((portfolio) => (
                <DropdownMenuItem 
                  key={portfolio.id} 
                  onSelect={() => setSelectedPortfolio(portfolio)}
                  className={selectedPortfolio?.id === portfolio.id ? "bg-muted" : ""}
                >
                  {portfolio.name} (₱{portfolio.available_cash.toLocaleString()})
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </>
          ) : null}
          <NewPortfolioDialog onPortfolioCreated={handlePortfolioCreated} />
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 