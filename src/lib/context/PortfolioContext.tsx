'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useUser } from '@/lib/hooks/useUser'
import { useToast } from '@/components/ui/use-toast'
import { Portfolio } from '@/lib/types'

interface PortfolioContextType {
  selectedPortfolio: Portfolio | null
  portfolios: Portfolio[]
  setSelectedPortfolio: (portfolio: Portfolio | null) => void
  refreshPortfolios: () => Promise<void>
  isLoading: boolean
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined)

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
  const [selectedPortfolio, setSelectedPortfolio] = useState<Portfolio | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user } = useUser()
  const { toast } = useToast()
  const supabase = createClientComponentClient()

  const loadPortfolios = async () => {
    if (!user) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const { data: portfoliosData, error: portfoliosError } = await supabase
        .from('portfolios')
        .select('*')
        .order('created_at', { ascending: false })

      if (portfoliosError) throw portfoliosError

      setPortfolios(portfoliosData || [])
      
      // Select a portfolio if we have any
      if (portfoliosData && portfoliosData.length > 0) {
        // Try to get the last selected portfolio from localStorage
        const savedPortfolioId = localStorage.getItem('selectedPortfolioId')
        
        // If we have a saved portfolio ID, check if it still exists in our portfolios list
        if (savedPortfolioId) {
          const savedPortfolio = portfoliosData.find(p => p.id === savedPortfolioId)
          if (savedPortfolio) {
            setSelectedPortfolio(savedPortfolio)
          } else {
            // If saved portfolio was deleted, select the first available one
            setSelectedPortfolio(portfoliosData[0])
          }
        } else {
          // No saved portfolio, select the first one
          setSelectedPortfolio(portfoliosData[0])
        }
      } else {
        // No portfolios available, clear selection
        setSelectedPortfolio(null)
        localStorage.removeItem('selectedPortfolioId')
      }
    } catch (error) {
      console.error('Error loading portfolios:', error)
      toast({
        title: 'Error',
        description: 'Failed to load portfolios',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load portfolios on initial mount or when user changes
  useEffect(() => {
    loadPortfolios()
  }, [user])

  // Save selected portfolio to localStorage whenever it changes
  useEffect(() => {
    if (selectedPortfolio) {
      localStorage.setItem('selectedPortfolioId', selectedPortfolio.id)
    }
  }, [selectedPortfolio])

  const setPortfolio = (portfolio: Portfolio | null) => {
    setSelectedPortfolio(portfolio)
  }

  return (
    <PortfolioContext.Provider
      value={{
        selectedPortfolio,
        portfolios,
        setSelectedPortfolio: setPortfolio,
        refreshPortfolios: loadPortfolios,
        isLoading,
      }}
    >
      {children}
    </PortfolioContext.Provider>
  )
}

export function usePortfolio() {
  const context = useContext(PortfolioContext)
  if (context === undefined) {
    throw new Error('usePortfolio must be used within a PortfolioProvider')
  }
  return context
} 