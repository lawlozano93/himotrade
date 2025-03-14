'use client'

import * as React from 'react'
import { CheckIcon, ChevronsUpDownIcon, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { type StockOption } from '@/lib/services/phStockService'

export type ComboboxItem = {
  label: string
  value: string
}

interface ComboboxProps {
  items: ComboboxItem[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
}

export function Combobox({
  items = [],
  value,
  onValueChange,
  placeholder = 'Select an item...',
  emptyText = 'No items found.',
  className,
  disabled,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const itemsRef = useRef<Array<HTMLDivElement | null>>([])
  
  const filteredItems = React.useMemo(() => {
    if (!searchQuery) return items
    return items.filter((item) => 
      item.value.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [items, searchQuery])
  
  // Focus the input when the dropdown opens
  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])
  
  // Reset highlighted index when filtered items change
  useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredItems.length])

  const handleSelect = (itemValue: string) => {
    onValueChange(itemValue)
    setSearchQuery("")
    setOpen(false)
  }
  
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onValueChange('')
    setOpen(false)
  }
  
  // Scroll the highlighted item into view
  useEffect(() => {
    if (listRef.current && itemsRef.current[highlightedIndex]) {
      const list = listRef.current
      const item = itemsRef.current[highlightedIndex]
      
      if (item) {
        const listRect = list.getBoundingClientRect()
        const itemRect = item.getBoundingClientRect()
        
        if (itemRect.bottom > listRect.bottom) {
          // Scroll down if the item is below the visible area
          list.scrollTop += itemRect.bottom - listRect.bottom
        } else if (itemRect.top < listRect.top) {
          // Scroll up if the item is above the visible area
          list.scrollTop -= listRect.top - itemRect.top
        }
      }
    }
  }, [highlightedIndex])
  
  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (filteredItems.length > 0) {
        setHighlightedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : prev
        )
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0)
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filteredItems.length > 0) {
        handleSelect(filteredItems[highlightedIndex].value)
      }
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }
  
  // Handle wheel scrolling
  const handleWheel = (e: React.WheelEvent) => {
    if (listRef.current) {
      e.stopPropagation()
      listRef.current.scrollTop += e.deltaY
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          aria-expanded={open}
          className={cn(
            'h-10 w-full justify-between overflow-hidden text-ellipsis',
            className
          )}
          disabled={disabled}
          role="combobox"
          variant="outline"
        >
          {value || placeholder}
          {disabled ? null : value ? (
            <X
              className="h-4 w-4 shrink-0 cursor-pointer opacity-50"
              onClick={handleClear}
            />
          ) : (
            <ChevronsUpDownIcon className="h-4 w-4 shrink-0 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[var(--radix-popover-trigger-width)] p-0">
        <div className="flex flex-col" onWheel={e => e.stopPropagation()}>
          <div className="flex items-center border-b px-3">
            <Input
              ref={inputRef}
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
              onKeyDown={handleKeyDown}
            />
          </div>
          
          <div 
            ref={listRef}
            className="max-h-[200px] overflow-y-auto"
            tabIndex={-1}
            onKeyDown={handleKeyDown}
            onWheel={handleWheel}
            style={{ willChange: 'scroll-position' }}
          >
            {filteredItems.length === 0 ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {emptyText}
              </div>
            ) : (
              <div className="p-1">
                {filteredItems.map((item, index) => (
                  <div
                    ref={(el) => {
                      itemsRef.current[index] = el;
                    }}
                    key={item.value}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none',
                      (highlightedIndex === index || value === item.value) && 'bg-accent text-accent-foreground'
                    )}
                    onClick={() => handleSelect(item.value)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                  >
                    <span className={cn('mr-2 h-4 w-4', value === item.value ? 'opacity-100' : 'opacity-0')}>
                      <CheckIcon className="h-4 w-4" />
                    </span>
                    {item.value}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
} 