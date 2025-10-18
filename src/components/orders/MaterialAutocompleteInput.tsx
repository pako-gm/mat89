import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import { getMaterialByRegistration, searchMaterialsByRegistration } from "@/lib/data";
import { Material } from "@/types";

interface MaterialAutocompleteInputProps {
  value: string;
  onChange: (registration: string, description?: string) => void;
  onMaterialNotFound: (registration: string) => void;
  placeholder?: string;
  className?: string;
  error?: boolean;
}

export interface MaterialAutocompleteInputRef {
  focus: () => void;
  clear: () => void;
}

const MaterialAutocompleteInput = forwardRef<MaterialAutocompleteInputRef, MaterialAutocompleteInputProps>(({
  value,
  onChange,
  onMaterialNotFound,
  placeholder = "89xxxxxx",
  className = "",
  error = false
}, ref) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const [suggestions, setSuggestions] = useState<Material[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Exponer métodos para el componente padre
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    clear: () => {
      onChange("");
      setValidationError("");
      setSuggestions([]);
      setShowDropdown(false);
      inputRef.current?.focus();
    }
  }));

  // Búsqueda incremental de sugerencias
  useEffect(() => {
    const searchSuggestions = async () => {
      // Solo buscar si tiene al menos 4 dígitos y empieza con 89
      if (value.length >= 4 && value.startsWith('89') && value.length < 8) {
        try {
          const results = await searchMaterialsByRegistration(value);
          setSuggestions(results.slice(0, 5)); // Máximo 5 sugerencias
          setShowDropdown(results.length > 0);
          setSelectedIndex(-1);
        } catch (error) {
          console.error('Error searching materials:', error);
          setSuggestions([]);
          setShowDropdown(false);
        }
      } else {
        setSuggestions([]);
        setShowDropdown(false);
      }
    };

    const timeoutId = setTimeout(searchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [value]);

  // Validar matrícula en tiempo real y auto-poblar descripción
  useEffect(() => {
    if (value.length === 0) {
      setValidationError("");
      return;
    }

    if (value.length > 0 && !value.startsWith('89')) {
      setValidationError("La matrícula debe comenzar por 89");
      return;
    }

    // Validar y auto-poblar cuando el usuario termina de escribir
    const validateAndAutofill = async () => {
      // Solo validar si la matrícula tiene 8 dígitos y empieza con 89
      if (value.length === 8 && value.startsWith('89')) {
        setIsValidating(true);
        setValidationError("");
        try {
          const material = await getMaterialByRegistration(parseInt(value));
          if (!material) {
            // Material no encontrado
            onMaterialNotFound(value);
          } else {
            // Material encontrado, auto-poblar descripción
            onChange(value, material.description);
          }
        } catch (error) {
          console.error('Error validating material:', error);
        } finally {
          setIsValidating(false);
        }
      }
    };
    // Retrasar la validación a 1000ms para evitar múltiples llamadas rápidas
    //anteriormente estaba en 500ms, ver markdown
    const timeoutId = setTimeout(validateAndAutofill, 1000);
    return () => clearTimeout(timeoutId);
  }, [value, onChange, onMaterialNotFound]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value.replace(/[^\d]/g, ''); // Solo números

    // Limitar a 8 dígitos
    if (inputValue.length > 8) {
      inputValue = inputValue.slice(0, 8);
    }

    // Si no empieza con 89 y tiene más de 2 dígitos, limitar a 2
    if (inputValue.length > 2 && !inputValue.startsWith('89')) {
      inputValue = inputValue.slice(0, 2);
    }

    onChange(inputValue);
  };

  // Manejar navegación por teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setSuggestions([]);
        setSelectedIndex(-1);
        break;
    }
  };

  // Seleccionar una sugerencia
  const handleSelectSuggestion = (material: Material) => {
    onChange(String(material.registration), material.description);
    setShowDropdown(false);
    setSuggestions([]);
    setSelectedIndex(-1);
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasValidationError = validationError || (error && value.length > 0 && !value.startsWith('89'));
  const inputClass = hasValidationError 
    ? 'border-red-500 focus:border-red-500 text-red-500' 
    : 'border-[#4C4C4C] focus:border-[#91268F]';

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={`h-9 ${inputClass} ${className}`}
        maxLength={8}
        autoComplete="off"
      />

      {/* Dropdown de sugerencias */}
      {showDropdown && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full bottom-full mb-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((material, index) => (
            <div
              key={material.id}
              onClick={() => handleSelectSuggestion(material)}
              className={`px-3 py-2 cursor-pointer text-sm hover:bg-gray-100 ${
                index === selectedIndex ? 'bg-gray-100' : ''
              }`}
            >
              <div className="font-medium text-gray-900">
                {material.registration}
              </div>
              <div className="text-gray-600 text-xs truncate">
                {material.description}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {validationError && (
        <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Loading indicator */}
      {isValidating && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#91268F] border-t-transparent"></div>
        </div>
      )}
    </div>
  );
});

MaterialAutocompleteInput.displayName = "MaterialAutocompleteInput";

export default MaterialAutocompleteInput;