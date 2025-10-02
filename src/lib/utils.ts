import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Función para filtrar entradas automáticas del sistema - CORREGIDA
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
    /^Updated\s+automatically/i,
    /^Modificación\s+líneas\s+pedido$/i,
    /^Cambio\s+en\s+líneas$/i,
    /^Líneas\s+actualizadas$/i,
    /^Material\s+agregado$/i,
    /^Material\s+eliminado$/i
  ];

  console.log('=== FILTRANDO CHANGE HISTORY ===');
  console.log('Total items recibidos:', changeHistory.length);

  const filtered = changeHistory.filter(change => {
    console.log('Procesando item:', {
      id: change.id,
      user: change.user,
      description: change.description,
      date: change.date
    });

    // Verificar que el comentario existe y no está vacío
    if (!change.description || !change.description.trim()) {
      console.log('  -> Descartado: descripción vacía');
      return false;
    }

    // Filtrar por patrones de texto automático
    const hasAutomaticPattern = automaticPatterns.some(pattern =>
      pattern.test(change.description.trim())
    );

    if (hasAutomaticPattern) {
      console.log('  -> Descartado: patrón automático');
      return false;
    }

    // Filtrar comentarios que parecen ser del sistema (usuario SISTEMA)
    const isSystemUser = /^(SISTEMA|system|auto)$/i.test(change.user.trim());

    if (isSystemUser) {
      console.log('  -> Descartado: usuario sistema');
      return false;
    }

    console.log('  -> ACEPTADO');
    return true;
  });

  console.log('Total items filtrados:', filtered.length);
  console.log('=== FIN FILTRADO ===');

  return filtered;
}

// Función para formatear fecha según especificación: [DD/MM/YYYY HH:MM]
function formatChangeHistoryDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    
    // Verificar que la fecha es válida
    if (isNaN(date.getTime())) {
      return `[${dateString}]`; // Retornar original con corchetes si no se puede parsear
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `[${day}/${month}/${year} ${hours}:${minutes}]`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return `[${dateString}]`; // Retornar original con corchetes en caso de error
  }
}

// Función para extraer el nombre del usuario desde el email
function formatUserName(userEmail: string): string {
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

// Nueva función para formatear una entrada completa del historial
function formatCompleteHistoryEntry(change: {
  date: string;
  user: string;
  description: string;
}): string {
  const formattedDate = formatChangeHistoryDate(change.date);
  const formattedUser = formatUserName(change.user);
  
  return `${formattedDate} - ${formattedUser}: ${change.description}`;
}

// Función para formato específico solicitado: [DD/MM/YYYY HH:MM] - usuario@dominio.com # texto del comentario
function formatNewCommentStyle(change: {
  date: string;
  user: string;
  description: string;
}): string {
  try {
    const date = new Date(change.date);
    
    // Verificar que la fecha es válida
    if (isNaN(date.getTime())) {
      return `[${change.date}] - ${change.user} # ${change.description}`;
    }
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    const formattedDate = `[${day}/${month}/${year} ${hours}:${minutes}]`;
    
    // Usar directamente el email del usuario sin extraer el nombre
    const userEmail = change.user || 'usuario@mat89.com';
    
    return `${formattedDate} - ${userEmail} # ${change.description}`;
  } catch (error) {
    console.error('Error formatting comment:', error);
    return `[${change.date}] - ${change.user} # ${change.description}`;
  }
}

// Nueva función para debuggear comentarios
function debugComments(changeHistory: Array<{
  id: string;
  date: string;
  user: string;
  description: string;
}>) {
  console.log('=== DEBUG COMENTARIOS ===');
  console.log('Total comentarios recibidos:', changeHistory.length);
  
  changeHistory.forEach((comment, index) => {
    console.log(`Comentario ${index + 1}:`, {
      id: comment.id,
      date: comment.date,
      user: comment.user,
      description: comment.description,
      descriptionLength: comment.description?.length || 0
    });
  });
  
  const filtered = filterManualChangeHistory(changeHistory);
  console.log('Comentarios después del filtro:', filtered.length);
  
  filtered.forEach((comment, index) => {
    console.log(`Comentario filtrado ${index + 1}:`, {
      id: comment.id,
      formatted: formatNewCommentStyle(comment)
    });
  });
  
  console.log('=== FIN DEBUG ===');
  
  return filtered;
}

// Función para formatear fecha a DD/MM/YYYY
export function formatDateToDDMMYYYY(dateString: string | null | undefined): string {
  if (!dateString) return '--';

  try {
    const date = new Date(dateString);

    // Verificar que la fecha es válida
    if (isNaN(date.getTime())) {
      return '--';
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  } catch (error) {
    console.error('Error formatting date:', error);
    return '--';
  }
}

// Función para formatear comentarios con formato: YYYY-MM-DD HH:mm:ss - usuario@email.com
export function formatCommentTimestamp(dateString: string): string {
  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) {
      return dateString;
    }

    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (error) {
    console.error('Error formatting comment timestamp:', error);
    return dateString;
  }
}