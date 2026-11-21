'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'

export type BankOption = {
  name: string
  code: string
}

export function SearchableBankSelect({
  banks,
  value,
  onChange,
  name,
  placeholder = 'Search bank by name or code (e.g. GTBank, OPay, Zenith)...',
  id,
}: {
  banks: BankOption[]
  value: string
  onChange: (bank: BankOption) => void
  name?: string
  placeholder?: string
  id?: string
}) {
  const uniqueBanks = useMemo(() => {
    const seen = new Set<string>()
    const result: BankOption[] = []
    for (const bank of banks || []) {
      const code = String(bank?.code || '').trim()
      const bankName = String(bank?.name || '').trim()
      if (!code || !bankName || seen.has(code)) continue
      seen.add(code)
      result.push({ code, name: bankName })
    }
    return result
  }, [banks])

  const selectedBank = useMemo(
    () => uniqueBanks.find((b) => b.code === value) || null,
    [uniqueBanks, value],
  )

  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlightIndex, setHighlightIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const filteredBanks = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return uniqueBanks
    return uniqueBanks.filter(
      (b) => b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q),
    )
  }, [uniqueBanks, query])

  useEffect(() => {
    setHighlightIndex(0)
  }, [query, open])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function pickBank(bank: BankOption) {
    onChange(bank)
    setOpen(false)
    setQuery('')
  }

  return (
    <div className="searchable-bank-select" ref={containerRef}>
      {name && <input type="hidden" name={name} value={value} />}
      <div className="bank-search-control">
        <Search size={15} className="bank-search-icon" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          value={open ? query : selectedBank ? `${selectedBank.name} (${selectedBank.code})` : query}
          placeholder={selectedBank ? `${selectedBank.name} — type to search banks` : placeholder}
          onFocus={() => {
            setOpen(true)
            setQuery('')
          }}
          onChange={(e) => {
            setQuery(e.target.value)
            if (!open) setOpen(true)
          }}
          onKeyDown={(e) => {
            if (!open && (e.key === 'ArrowDown' || e.key === 'Enter')) {
              e.preventDefault()
              setOpen(true)
              return
            }
            if (e.key === 'Escape') {
              setOpen(false)
              setQuery('')
              return
            }
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setHighlightIndex((i) => Math.min(filteredBanks.length - 1, i + 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setHighlightIndex((i) => Math.max(0, i - 1))
            } else if (e.key === 'Enter' && open && filteredBanks[highlightIndex]) {
              e.preventDefault()
              pickBank(filteredBanks[highlightIndex])
            }
          }}
        />
        {open && query ? (
          <button
            type="button"
            className="bank-search-action"
            aria-label="Clear bank search"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
          >
            <X size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="bank-search-action"
            aria-label={open ? 'Close bank list' : 'Open bank list'}
            onClick={() => {
              setOpen((prev) => !prev)
              if (!open) {
                setQuery('')
                inputRef.current?.focus()
              }
            }}
          >
            <ChevronDown size={15} />
          </button>
        )}
      </div>

      {selectedBank && (
        <small className="bank-selected-meta">
          Selected: <strong>{selectedBank.name}</strong> · Code {selectedBank.code} (
          {uniqueBanks.length} banks available)
        </small>
      )}

      {open && (
        <div className="bank-search-dropdown" role="listbox">
          {filteredBanks.length === 0 ? (
            <div className="bank-search-empty">No matching Nigerian banks found for “{query}”.</div>
          ) : (
            filteredBanks.map((bank, idx) => {
              const isSelected = bank.code === value
              const isHighlighted = idx === highlightIndex
              return (
                <button
                  key={bank.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className={`bank-search-option ${isSelected ? 'selected' : ''} ${
                    isHighlighted ? 'highlighted' : ''
                  }`}
                  onMouseEnter={() => setHighlightIndex(idx)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    pickBank(bank)
                  }}
                >
                  <span>{bank.name}</span>
                  <small>
                    {bank.code}
                    {isSelected && <Check size={13} />}
                  </small>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
