import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { PortfolioOverview } from "@/components/portfolio/PortfolioOverview"
import { PortfolioTransactions } from "@/components/portfolio/PortfolioTransactions"
import { PortfolioPerformance } from "@/components/portfolio/PortfolioPerformance"
import { CreatePortfolioDialog } from "@/components/portfolio/CreatePortfolioDialog"

export default function PortfolioPage() {
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Portfolio Management</h1>
        <CreatePortfolioDialog />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <PortfolioOverview />
        </TabsContent>

        <TabsContent value="transactions">
          <PortfolioTransactions />
        </TabsContent>

        <TabsContent value="performance">
          <PortfolioPerformance />
        </TabsContent>
      </Tabs>
    </div>
  )
} 