import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Material } from "@/types"

interface MaterialComboboxProps {
  materials: Material[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  onCreateNew?: (searchText: string) => void
}

export function MaterialCombobox({
  materials,
  value,
  onValueChange,
  placeholder = "Seleccione un material",
  emptyMessage = "No se encontraron materiales",
  disabled = false,
  className,
  onCreateNew,
}: MaterialComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  // Find selected material
  const selectedMaterial = React.useMemo(() => {
    return materials.find((material) => material.id === value)
  }, [materials, value])

  // Filter materials based on search
  const filteredMaterials = React.useMemo(() => {
    if (!search.trim()) return materials

    const searchLower = search.toLowerCase()
    return materials.filter((material) => {
      const regMatch = material.registration.toString().includes(searchLower)
      const descMatch = material.description.toLowerCase().includes(searchLower)
      const serieMatch = material.vehicleSeries?.toLowerCase().includes(searchLower)
      return regMatch || descMatch || serieMatch
    })
  }, [materials, search])

  // Handle material selection
  const handleSelect = (material: Material) => {
    onValueChange(material.id)
    setSearch("")
    setOpen(false)
    setSelectedIndex(-1)
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || filteredMaterials.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev =>
          prev < filteredMaterials.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && selectedIndex < filteredMaterials.length) {
          handleSelect(filteredMaterials[selectedIndex])
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setSearch("")
        setSelectedIndex(-1)
        break
    }
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setOpen(false)
        setSearch("")
        setSelectedIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Auto-scroll to selected item
  React.useEffect(() => {
    if (selectedIndex >= 0 && dropdownRef.current) {
      const selectedElement = dropdownRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex])

  return (
    <div className={cn("relative", className)}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen(!open)
          if (!open) {
            setTimeout(() => inputRef.current?.focus(), 0)
          }
        }}
        disabled={disabled}
        className={cn(
          "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          !value && "text-muted-foreground"
        )}
      >
        {selectedMaterial ? (
          <span className="truncate">
            {selectedMaterial.registration} - {selectedMaterial.description} - {selectedMaterial.vehicleSeries}
          </span>
        ) : (
          placeholder
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b">
            <Input
              ref={inputRef}
              type="text"
              placeholder="Buscar por matrícula, descripción o serie..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setSelectedIndex(-1)
              }}
              onKeyDown={handleKeyDown}
              className="h-9"
              autoComplete="off"
            />
          </div>

          {/* Results List */}
          <div
            ref={dropdownRef}
            className="max-h-[300px] overflow-y-auto p-1"
          >
            {filteredMaterials.length === 0 ? (
              <div className="py-4 px-2">
                <div className="text-center text-sm text-muted-foreground mb-3">
                  {emptyMessage}
                </div>
                {onCreateNew && search.trim().length > 0 && (
                  <button
                    onClick={() => {
                      onCreateNew(search)
                      setOpen(false)
                      setSearch("")
                    }}
                    className="w-full px-3 py-2 text-sm bg-[#91268F] text-white rounded-md hover:bg-[#7a1f78] transition-colors"
                  >
                    ¿Deseas crear este material?
                  </button>
                )}
              </div>
            ) : (
              filteredMaterials.map((material, index) => (
                <div
                  key={material.id}
                  onClick={() => handleSelect(material)}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                    index === selectedIndex && "bg-accent text-accent-foreground",
                    index !== selectedIndex && "hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === material.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex-1 truncate">
                    {material.registration} - {material.description} - {material.vehicleSeries}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
