import { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { Input } from "@/components/ui/input";

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
  const inputRef = useRef<HTMLInputElement>(null);

  // Exponer métodos para el componente padre
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    clear: () => {
      onChange("");
      inputRef.current?.focus();
    }
  }));

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let inputValue = e.target.value.replace(/[^\d]/g, ''); // Solo números
    
    // Limitar a 8 dígitos
    if (inputValue.length > 8) {
      inputValue = inputValue.slice(0, 8);
    }
    
    onChange(inputValue);
  };

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
        className={`h-9 ${error ? 'border-red-500 focus:border-red-500' : 'border-[#4C4C4C] focus:border-[#91268F]'} ${className}`}
        maxLength={8}
        autoComplete="off"
      />
    </div>
  );
});

MaterialAutocompleteInput.displayName = "MaterialAutocompleteInput";

export default MaterialAutocompleteInput;