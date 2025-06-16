import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Función para filtrar entradas automáticas del sistema
export function filterManualChangeHistory(changeHistory: Array<{
  id: string;
  date: string;
  user: string;
  description: string;
}>) {
  // Patrones de descripciones automáticas generadas por el sistema
  const automaticPatterns = [
    /^Creación\s+pedido$/i,
    /^Actualización\s+de\s+pedido$/i,
    /^Creación$/i,
    /^Actualización$/i,
    /^Sistema:/i,
    /^SISTEMA$/i,
    /^\[SISTEMA\]/i,
    /^Auto:/i,
    /^Automatic/i,
    /^Created\s+automatically/i,
    /^Updated\s+automatically/i
  ];

  return changeHistory.filter(change => {
    // Filtrar por patrones de texto automático
    const hasAutomaticPattern = automaticPatterns.some(pattern => 
      pattern.test(change.description.trim())
    );
    
    // Filtrar entradas muy cortas que típicamente son automáticas
    const isTooShort = change.description.trim().length < 10;
    
    // Mantener solo comentarios que parecen ser manuales
    return !hasAutomaticPattern && !isTooShort;
  });
}

// Función para formatear fecha según especificación: DD/MM/YYYY - HH:MM
export function formatChangeHistoryDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    
    // Verificar que la fecha es válida
    if (isNaN(date.getTime())) {
      return dateString; // Retornar original si no se puede parsear
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${day}/${month}/${year} - ${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return dateString; // Retornar original en caso de error
  }
}

// Función para extraer el nombre del usuario desde el email
export function formatUserName(userEmail: string): string {
  if (!userEmail || typeof userEmail !== 'string') {
    return 'Usuario';
  }
  
  // Extraer nombre antes del @ si es un email
  if (userEmail.includes('@')) {
    const username = userEmail.split('@')[0];
    // Capitalizar primera letra y reemplazar puntos/guiones por espacios
    return username
      .replace(/[._-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  return userEmail;
}