'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/lib/hooks/useUser'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/services/supabase'
import { useToast } from '@/components/ui/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Combobox } from '@/components/ui/combobox'
import { getPhStocks, DEFAULT_PH_STOCKS, type StockOption } from '@/lib/services/phStockService'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { tradeService } from '@/lib/services/tradeService'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Strategy {
  id: string
  name: string
}

const formSchema = z.object({
  symbol: z.string().min(1, 'Stock symbol is required'),
  entry_price: z.coerce.number().min(0.01, 'Entry price must be greater than 0'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
  strategy_id: z.string().optional(),
  portfolio_id: z.string().min(1, 'Portfolio is required'),
})

type FormValues = z.infer<typeof formSchema>

export function NewTradeForm() {
  const { user } = useUser()
  const { toast } = useToast()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [strategies, setStrategies] = useState<Strategy[]>([])
  const [isLoadingSymbols, setIsLoadingSymbols] = useState(false)
  const [stocks, setStocks] = useState<StockOption[]>(DEFAULT_PH_STOCKS)
  const [portfolios, setPortfolios] = useState<{id: string, name: string}[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      symbol: '',
      entry_price: undefined,
      quantity: undefined,
      strategy_id: '',
      portfolio_id: '',
    },
  })

  useEffect(() => {
    // Fetch strategies when component mounts
    const fetchStrategies = async () => {
      try {
        const { data: strategiesData, error } = await supabase
          .from('strategies')
          .select('*')
          .order('name')

        if (error) throw error
        setStrategies(strategiesData || [])
      } catch (error) {
        console.error('Error fetching strategies:', error)
        toast({
          title: 'Error',
          description: 'Failed to load strategies',
          variant: 'destructive',
        })
      }
    }

    // Fetch portfolios
    const fetchPortfolios = async () => {
      try {
        const { data: portfoliosData, error } = await supabase
          .from('portfolios')
          .select('*')
          .eq('user_id', user?.id)
          .order('name')

        if (error) throw error
        setPortfolios(portfoliosData || [])
        
        // Set default portfolio if available
        if (portfoliosData && portfoliosData.length > 0) {
          form.setValue('portfolio_id', portfoliosData[0].id)
        }
      } catch (error) {
        console.error('Error fetching portfolios:', error)
        toast({
          title: 'Error',
          description: 'Failed to load portfolios',
          variant: 'destructive',
        })
      }
    }

    fetchStrategies()
    if (user?.id) {
      fetchPortfolios()
    }
  }, [toast, user?.id, form])

  useEffect(() => {
    // Fetch PH stocks when component mounts
    const fetchPhStocks = async () => {
      try {
        setIsLoadingSymbols(true)
        const fetchedStocks = await getPhStocks()
        setStocks(fetchedStocks)
      } catch (error) {
        console.error('Error fetching PH stocks:', error)
        toast({
          title: 'Warning',
          description: 'Using default stock list due to API error',
          variant: 'destructive',
        })
        setStocks(DEFAULT_PH_STOCKS)
      } finally {
        setIsLoadingSymbols(false)
      }
    }

    fetchPhStocks()
  }, [toast])

  async function onSubmit(values: FormValues) {
    setLoading(true)
    
    try {
      if (!values.portfolio_id || !values.symbol || !values.entry_price || !values.quantity) {
        throw new Error("All required fields must be provided")
      }
      
      // Get the freshest user directly from Supabase auth
      const supabase = createClientComponentClient()
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !currentUser) {
        console.error("Error getting current user:", userError)
        toast({
          title: "Authentication Error",
          description: "Please try logging out and back in again.",
          variant: "destructive"
        })
        throw new Error("You must be logged in to create a trade")
      }
      
      console.log("Creating trade with user_id:", currentUser.id)
      
      const result = await tradeService.createTrade({
        user_id: currentUser.id,
        portfolio_id: values.portfolio_id,
        symbol: values.symbol,
        entry_price: values.entry_price,
        quantity: values.quantity,
        side: 'long', // Default to long
        entry_date: new Date().toISOString(),
        strategy_id: values.strategy_id || null,
      })
      
      toast({
        title: 'Success',
        description: result.merged 
          ? `Added to existing ${values.symbol} position` 
          : 'New trade created successfully',
      })
      router.push('/trades')
      router.refresh()
    } catch (error) {
      console.error('Error creating trade:', error)
      toast({
        title: 'Error',
        description: 'Failed to create trade. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="portfolio_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Portfolio</FormLabel>
              <FormControl>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a portfolio" />
                  </SelectTrigger>
                  <SelectContent>
                    {portfolios.map((portfolio) => (
                      <SelectItem key={portfolio.id} value={portfolio.id}>
                        {portfolio.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="symbol"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Select Stock</FormLabel>
              <FormControl>
                <Combobox
                  items={stocks}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder="Search for a stock..."
                  emptyText="No stocks found"
                  className="w-full"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="entry_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Entry Price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Quantity</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="0"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="strategy_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Strategy</FormLabel>
              <FormControl>
                <Select 
                  onValueChange={field.onChange}
                  value={field.value}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a strategy (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {strategies.map((strategy) => (
                      <SelectItem key={strategy.id} value={strategy.id}>
                        {strategy.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Trade'}
        </Button>
      </form>
    </Form>
  )
} 