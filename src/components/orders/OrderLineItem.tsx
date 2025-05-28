import { useState } from "react";
import { OrderLine } from "@/types";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Trash2 } from "lucide-react"; 

interface OrderLineItemProps {
  orderLine: OrderLine;
  onDelete: (id: string) => void;
  onUpdate: (id: string, data: Partial<OrderLine>) => void;
}

export default function OrderLineItem({ orderLine, onDelete, onUpdate }: OrderLineItemProps) {
  const [isChecked, setIsChecked] = useState(false);
  const [isRegistrationValid, setIsRegistrationValid] = useState(true);
  const [isQuantityValid, setIsQuantityValid] = useState(true);
  
  const validateRegistration = (value: string): boolean => {
    if (!value) return true;
    const isValid = value.startsWith('89');
    setIsRegistrationValid(value === "" || isValid);
    return isValid;
  };

  const validateQuantity = (value: number): boolean => {
    const isValid = value > 0;
    setIsQuantityValid(isValid);
    return isValid;
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let numericValue;
    
    if (name === "quantity") {
      numericValue = parseInt(value) || 0;
      validateQuantity(numericValue);
    } else {
      numericValue = value;
    }
    
    onUpdate(orderLine.id, { [name]: numericValue });
  };

  return (
    <div className="grid grid-cols-[2fr,3fr,1fr,2fr,auto] gap-4 items-center mb-2">
      <Input
        name="registration"
        value={orderLine.registration.replace(/[^\d]/g, '')}
        onChange={(e) => {
          let value = e.target.value.replace(/[^\d]/g, '');
          // Only allow more digits if empty, starts with 89, or is still typing the first two digits
          if (value.length <= 2 || value.startsWith('89')) {
            value = value.slice(0, 8);
          } else {
            value = value.slice(0, 2);
          }
          validateRegistration(value);
          onUpdate(orderLine.id, { registration: value });
        }}
        onFocus={(e) => e.target.placeholder = ""}
        onBlur={(e) => e.target.placeholder = "89654014"}
        placeholder="89654014"
        className={`h-9 placeholder:text-gray-300 border-[#4C4C4C] focus:border-[#91268F] ${
          !isRegistrationValid && orderLine.registration 
            ? 'border-red-500 focus:border-red-500 text-red-500' 
            : ''}`}
      />
      
      <Input
        name="partDescription"
        value={orderLine.partDescription}
        onChange={(e) => {
          const value = e.target.value.toUpperCase();
          onUpdate(orderLine.id, { partDescription: value });
        }}
        onFocus={(e) => e.target.placeholder = ""}
        onBlur={(e) => e.target.placeholder = "Descripción Pieza"}
        placeholder="Descripción Pieza"
        className="h-9 placeholder:text-gray-300 border-[#4C4C4C] focus:border-[#91268F]"
      />
      
      <Input
        name="quantity"
        type="number"
        min="0"
        value={orderLine.quantity}
        onChange={handleChange}
        placeholder="1"
        className={`h-9 border-[#4C4C4C] focus:border-[#91268F] ${!isQuantityValid ? 'border-red-500 focus:border-red-500' : ''}`}
      />
      
      <Input
        name="serialNumber"
        value={orderLine.serialNumber}
        onChange={(e) => {
          const value = e.target.value.toUpperCase();
          onUpdate(orderLine.id, { serialNumber: value });
        }}
        onFocus={(e) => e.target.placeholder = ""}
        onBlur={(e) => e.target.placeholder = "ST/3145874"}
        placeholder="ST/3145874"
        className="h-9 placeholder:text-gray-300 border-[#4C4C4C] focus:border-[#91268F]"
      />
      
      <div className="flex space-x-1">
        <Button 
          type="button"
          variant="ghost" 
          size="sm"
          className={`p-0 h-8 w-8 ${isChecked ? 'text-[#91268F]' : ''}`}
          onClick={() => setIsChecked(!isChecked)}
        >
          <Check className="h-4 w-4" />
        </Button>
        
        <Button 
          type="button"
          variant="ghost" 
          size="sm"
          className="p-0 h-8 w-8 text-[#91268F] hover:text-[#7A1F79]"
          onClick={() => onDelete(orderLine.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}