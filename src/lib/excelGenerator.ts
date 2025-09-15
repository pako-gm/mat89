//version con mejoras en la gestion de filas y formato de la plantilla
import * as XLSX from 'xlsx';

interface OrderData {
  num_pedido: string;
  fecha_envio: string;
  garantia: boolean;
  averia_declarada: string;
  vehiculo: string;
  alm_envia: string;
  tbl_proveedores: {
    nombre: string;
    direccion: string;
    ciudad: string;
    codigo_postal: string;
    provincia: string;
    email: string;
    persona_contacto: string;
  };
  tbl_ln_pedidos_rep: Array<{
    matricula_89: string;
    descripcion: string;
    nenv: number;
    nsenv: string;
  }>;
}

interface PlaceholderReplacements {
  [key: string]: string | number | boolean;
}

export class ExcelGenerator {
  private workbook: XLSX.WorkBook | null = null;
  private worksheet: XLSX.WorkSheet | null = null;
  private templateRowIndex: number = -1;
  private orderData: OrderData | null = null;
  private originalStyles: { [address: string]: any } = {};

  /**
   * Load the Excel template from the public folder
   */
  async loadTemplate(): Promise<void> {
    try {
      const response = await fetch('/plantillas/int_excel_template.xlsx');
      if (!response.ok) {
        throw new Error(`No se pudo cargar la plantilla: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      // Importante: cargar con cellStyles: true y cellHTML: false para preservar formato
      this.workbook = XLSX.read(arrayBuffer, { 
        type: 'array', 
        cellStyles: true,
        cellHTML: false,
        cellNF: true,
        cellDates: true
      });
      
      if (!this.workbook.SheetNames.length) {
        throw new Error('La plantilla no contiene hojas de cálculo');
      }
      
      // Use the first sheet
      const sheetName = this.workbook.SheetNames[0];
      this.worksheet = this.workbook.Sheets[sheetName];
      
      // Preserve original styles
      this.preserveOriginalStyles();
      
      // Find the template row (row containing {descripcion})
      this.findTemplateRow();
      
    } catch (error) {
      console.error('Error loading Excel template:', error);
      throw new Error(`Error al cargar la plantilla Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Preserve original styles from the worksheet
   */
  private preserveOriginalStyles(): void {
    if (!this.worksheet) return;

    const range = XLSX.utils.decode_range(this.worksheet['!ref'] || 'A1:A1');
    
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = this.worksheet[cellAddress];
        
        if (cell) {
          this.originalStyles[cellAddress] = {
            s: cell.s ? JSON.parse(JSON.stringify(cell.s)) : undefined,
            t: cell.t,
            f: cell.f,
            w: cell.w,
            z: cell.z
          };
        }
      }
    }
  }

  /**
   * Find the row that contains the {descripcion} placeholder
   */
  private findTemplateRow(): void {
    if (!this.worksheet) {
      throw new Error('No hay hoja de cálculo cargada');
    }

    const range = XLSX.utils.decode_range(this.worksheet['!ref'] || 'A1:A1');
    
    for (let row = range.s.r; row <= range.e.r; row++) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = this.worksheet[cellAddress];
        
        if (cell && cell.v && typeof cell.v === 'string' && cell.v.includes('{descripcion}')) {
          this.templateRowIndex = row;
          return;
        }
      }
    }
    
    throw new Error('No se encontró la fila plantilla con el placeholder {descripcion} en el archivo Excel');
  }

  /**
   * Generate Excel file with order data
   */
  async generateExcel(orderData: OrderData): Promise<ArrayBuffer> {
    await this.loadTemplate();
    
    // Store order data for use in other methods
    this.orderData = orderData;
    
    if (!this.workbook || !this.worksheet) {
      throw new Error('No se pudo cargar la plantilla Excel');
    }

    if (this.templateRowIndex === -1) {
      throw new Error('No se encontró la fila plantilla en el Excel');
    }

    // Prepare global replacements
    const globalReplacements: PlaceholderReplacements = {
      num_pedido: orderData.num_pedido,
      fecha_envio: this.formatDate(orderData.fecha_envio),
      garantia: orderData.garantia ? 'SÍ' : 'NO',
      averia_declarada: orderData.averia_declarada || '',
      alm_envia: orderData.alm_envia || '',
      nombre: orderData.tbl_proveedores?.nombre || '',
      direccion: orderData.tbl_proveedores?.direccion || '',
      ciudad: orderData.tbl_proveedores?.ciudad || '',
      codigo_postal: orderData.tbl_proveedores?.codigo_postal || '',
      provincia: orderData.tbl_proveedores?.provincia || '',
      email: orderData.tbl_proveedores?.email || '',
      persona_contacto: orderData.tbl_proveedores?.persona_contacto || ''
    };

    // Replace global placeholders
    this.replaceGlobalPlaceholders(globalReplacements);

    // Process order lines
    this.processOrderLines(orderData.tbl_ln_pedidos_rep);

    // Generate the Excel buffer with better options for preserving formatting
    return XLSX.write(this.workbook, { 
      type: 'array', 
      bookType: 'xlsx',
      cellStyles: true,
      compression: true
    });
  }

  /**
   * Replace global placeholders in the worksheet
   */
  private replaceGlobalPlaceholders(replacements: PlaceholderReplacements): void {
    if (!this.worksheet) return;

    const range = XLSX.utils.decode_range(this.worksheet['!ref'] || 'A1:A1');
    
    for (let row = range.s.r; row <= range.e.r; row++) {
      // Skip the template row, it will be handled separately
      if (row === this.templateRowIndex) continue;
      
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = this.worksheet[cellAddress];
        
        if (cell && cell.v && typeof cell.v === 'string') {
          let cellValue = cell.v;
          let hasReplacement = false;
          
          // Replace all placeholders in this cell
          Object.entries(replacements).forEach(([key, value]) => {
            const placeholder = `{${key}}`;
            if (cellValue.includes(placeholder)) {
              cellValue = cellValue.replace(new RegExp(placeholder, 'g'), String(value));
              hasReplacement = true;
            }
          });
          
          if (hasReplacement) {
            // Preserve original formatting while updating value
            cell.v = cellValue;
            if (cell.w !== undefined) {
              cell.w = cellValue;
            }
            // Preserve original styles
            if (this.originalStyles[cellAddress]?.s) {
              cell.s = this.originalStyles[cellAddress].s;
            }
          }
        }
      }
    }
  }

  /**
   * Process order lines and duplicate the template row
   */
  private processOrderLines(orderLines: OrderData['tbl_ln_pedidos_rep']): void {
    if (!this.worksheet || !orderLines.length) return;

    const range = XLSX.utils.decode_range(this.worksheet['!ref'] || 'A1:A1');
    
    // Get the template row data with complete formatting
    const templateRow = this.getRowDataWithFormatting(this.templateRowIndex, range);
    
    // Process each order line
    orderLines.forEach((line, index) => {
      const targetRowIndex = this.templateRowIndex + index;
      
      // If this is not the first line, we need to insert a new row
      if (index > 0) {
        this.insertRowWithFormatting(targetRowIndex, range, templateRow);
        // Update range after insertion
        range.e.r++;
      }
      
      // Fill the row with line data
      this.fillRowWithLineData(targetRowIndex, templateRow, line, this.orderData, range);
    });
    
    // Update worksheet range
    this.worksheet['!ref'] = XLSX.utils.encode_range(range);
  }

  /**
   * Get all cell data from a specific row with complete formatting
   */
  private getRowDataWithFormatting(rowIndex: number, range: XLSX.Range): { [col: number]: XLSX.CellObject } {
    const rowData: { [col: number]: XLSX.CellObject } = {};
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
      const cell = this.worksheet![cellAddress];
      if (cell) {
        // Create a deep copy of the cell to preserve all formatting
        rowData[col] = {
          v: cell.v,
          w: cell.w,
          t: cell.t,
          f: cell.f,
          z: cell.z,
          s: cell.s ? JSON.parse(JSON.stringify(cell.s)) : undefined,
          l: cell.l,
          h: cell.h
        };
      } else {
        // Even for empty cells, preserve potential formatting from the original template
        const originalStyle = this.originalStyles[cellAddress];
        if (originalStyle?.s) {
          rowData[col] = {
            v: '',
            s: JSON.parse(JSON.stringify(originalStyle.s))
          };
        }
      }
    }
    
    return rowData;
  }

  /**
   * Insert a new row by shifting existing rows down while preserving formatting
   */
  private insertRowWithFormatting(insertAtRow: number, range: XLSX.Range, templateRow: { [col: number]: XLSX.CellObject }): void {
    if (!this.worksheet) return;

    // Shift all rows below the insertion point down by one
    for (let row = range.e.r; row >= insertAtRow; row--) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const oldAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const newAddress = XLSX.utils.encode_cell({ r: row + 1, c: col });
        
        if (this.worksheet[oldAddress]) {
          // Deep copy to preserve formatting
          this.worksheet[newAddress] = {
            v: this.worksheet[oldAddress].v,
            w: this.worksheet[oldAddress].w,
            t: this.worksheet[oldAddress].t,
            f: this.worksheet[oldAddress].f,
            z: this.worksheet[oldAddress].z,
            s: this.worksheet[oldAddress].s ? JSON.parse(JSON.stringify(this.worksheet[oldAddress].s)) : undefined,
            l: this.worksheet[oldAddress].l,
            h: this.worksheet[oldAddress].h
          };
        }
      }
    }

    // Clear the old row
    for (let col = range.s.c; col <= range.e.c; col++) {
      const oldAddress = XLSX.utils.encode_cell({ r: insertAtRow, c: col });
      delete this.worksheet[oldAddress];
    }
  }

  /**
   * Fill a row with order line data while preserving formatting
   */
  private fillRowWithLineData(
    rowIndex: number, 
    templateRow: { [col: number]: XLSX.CellObject }, 
    lineData: OrderData['tbl_ln_pedidos_rep'][0],
    orderData: OrderData | null,
    range: XLSX.Range
  ): void {
    if (!orderData) return;
    
    // Calculate fecha_necesidad (fecha_envio + 15 days)
    const fechaNecesidad = this.calculateFechaNecesidad(orderData.fecha_envio);
    
    const lineReplacements: PlaceholderReplacements = {
      matricula: lineData.matricula_89,
      descripcion: lineData.descripcion,
      nenv: lineData.nenv,
      nsenv: lineData.nsenv || '',
      vehiculo: orderData.vehiculo || '',
      alm_envia: orderData.alm_envia || '',
      almacen: orderData.alm_envia || '', // Support both placeholders
      fecha_necesidad: fechaNecesidad
    };

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
      
      // Copy the template cell if it exists, preserving ALL formatting
      if (templateRow[col]) {
        this.worksheet![cellAddress] = {
          v: templateRow[col].v,
          w: templateRow[col].w,
          t: templateRow[col].t,
          f: templateRow[col].f,
          z: templateRow[col].z,
          s: templateRow[col].s ? JSON.parse(JSON.stringify(templateRow[col].s)) : undefined,
          l: templateRow[col].l,
          h: templateRow[col].h
        };
        
        const cell = this.worksheet![cellAddress];
        if (cell.v && typeof cell.v === 'string') {
          let cellValue = cell.v;
          
          // Replace placeholders in this cell
          Object.entries(lineReplacements).forEach(([key, value]) => {
            const placeholder = `{${key}}`;
            cellValue = cellValue.replace(new RegExp(placeholder, 'g'), String(value));
          });
          
          cell.v = cellValue;
          if (cell.w !== undefined) {
            cell.w = cellValue;
          }
        }
      }
    }
  }

  /**
   * Calculate fecha_necesidad (fecha_envio + 15 days)
   */
  private calculateFechaNecesidad(fechaEnvio: string): string {
    if (!fechaEnvio) return '';
    
    try {
      const date = new Date(fechaEnvio);
      // Ensure we have a valid date
      if (isNaN(date.getTime())) {
        return '';
      }
      
      // Add 15 days
      date.setDate(date.getDate() + 15);
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      console.error('Error calculating fecha_necesidad:', error);
      return '';
    }
  }

  /**
   * Format date to DD/MM/YYYY
   */
  private formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return dateString;
    }
  }
}

/**
 * Main function to generate Excel for internal suppliers
 */
export async function generateInternalSupplierExcel(orderData: OrderData): Promise<ArrayBuffer> {
  const generator = new ExcelGenerator();
  return await generator.generateExcel(orderData);
}