import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { Input } from "@/components/ui/input";
import { Check, AlertCircle } from "lucide-react";
import { searchMaterialsByRegistration, getMaterialByRegistration } from "@/lib/data";
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
  const [suggestions, setSuggestions] = useState<Material[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Exponer métodos para el componente padre
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    clear: () => {
      onChange("");
      setSuggestions([]);
      setShowSuggestions(false);
      setSelectedIndex(-1);
      setValidationError("");
      inputRef.current?.focus();
    }
  }));

  // Buscar sugerencias mientras el usuario escribe
  useEffect(() => {
    const searchMaterials = async () => {
      if (value.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      // Solo buscar si empieza con 89
      if (!value.startsWith('89')) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoading(true);
      try {
        const results = await searchMaterialsByRegistration(value);
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Error searching materials:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(searchMaterials, 300);
    return () => clearTimeout(timeoutId);
  }, [value]);

  // Validar matrícula en tiempo real
  useEffect(() => {
    if (value.length === 0) {
      setValidationError("");
      return;
    }

    if (value.length > 0 && !value.startsWith('89')) {
      setValidationError("La matrícula debe comenzar por 89");
      return;
    }

    // Validar matrícula cuando el usuario termina de escribir
    const validateMaterial = async () => {
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

    const timeoutId = setTimeout(validateMaterial, 500);
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

  const handleSuggestionClick = (material: Material) => {
    onChange(material.registration.toString(), material.description);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    setValidationError("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;

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
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleFocus = () => {
    if (suggestions.length > 0 && value.startsWith('89')) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding suggestions to allow click
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 150);
  };

  // Scroll del elemento seleccionado
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      });
    }
  }, [selectedIndex]);

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
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={`h-9 ${inputClass} ${className}`}
        maxLength={8}
        autoComplete="off"
      />
      
      {/* Error message */}
      {validationError && (
        <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          <span>{validationError}</span>
        </div>
      )}
      
      {showSuggestions && suggestions.length > 0 && value.startsWith('89') && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
          {suggestions.map((material, index) => (
            <div
              key={material.id}
              ref={el => suggestionRefs.current[index] = el}
              className={`px-3 py-2 cursor-pointer hover:bg-gray-50 border-b border-gray-100 last:border-0 ${
                index === selectedIndex ? 'bg-blue-50 border-blue-200' : ''
              }`}
              onClick={() => handleSuggestionClick(material)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {material.registration}
                  </div>
                  <div className="text-xs text-gray-600 truncate">
                    {material.description}
                  </div>
                  {material.vehicleSeries && (
                    <div className="text-xs text-gray-500">
                      Serie: {material.vehicleSeries}
                    </div>
                  )}
                </div>
                {index === selectedIndex && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {(isLoading || isValidating) && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#91268F] border-t-transparent"></div>
        </div>
      )}
    </div>
  );
});

MaterialAutocompleteInput.displayName = "MaterialAutocompleteInput";

export default MaterialAutocompleteInput;