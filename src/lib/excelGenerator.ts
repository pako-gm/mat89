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
      this.workbook = XLSX.read(arrayBuffer, { type: 'array', cellStyles: true });
      
      if (!this.workbook.SheetNames.length) {
        throw new Error('La plantilla no contiene hojas de cálculo');
      }
      
      // Use the first sheet
      const sheetName = this.workbook.SheetNames[0];
      this.worksheet = this.workbook.Sheets[sheetName];
      
      // Find the template row (row containing {descripcion})
      this.findTemplateRow();
      
    } catch (error) {
      console.error('Error loading Excel template:', error);
      throw new Error(`Error al cargar la plantilla Excel: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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
      vehiculo: orderData.vehiculo || '',
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

    // Generate the Excel buffer
    return XLSX.write(this.workbook, { 
      type: 'array', 
      bookType: 'xlsx',
      cellStyles: true 
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
            cell.v = cellValue;
            cell.w = cellValue; // Also update the formatted value
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
    
    // Get the template row data
    const templateRow = this.getRowData(this.templateRowIndex, range);
    
    // Process each order line
    orderLines.forEach((line, index) => {
      const targetRowIndex = this.templateRowIndex + index;
      
      // If this is not the first line, we need to insert a new row
      if (index > 0) {
        this.insertRow(targetRowIndex, range);
        // Update range after insertion
        range.e.r++;
      }
      
      // Fill the row with line data
      this.fillRowWithLineData(targetRowIndex, templateRow, line, range);
    });
    
    // Update worksheet range
    this.worksheet['!ref'] = XLSX.utils.encode_range(range);
  }

  /**
   * Get all cell data from a specific row
   */
  private getRowData(rowIndex: number, range: XLSX.Range): { [col: number]: XLSX.CellObject } {
    const rowData: { [col: number]: XLSX.CellObject } = {};
    
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
      const cell = this.worksheet![cellAddress];
      if (cell) {
        // Create a copy of the cell to preserve formatting
        rowData[col] = { ...cell };
      }
    }
    
    return rowData;
  }

  /**
   * Insert a new row by shifting existing rows down
   */
  private insertRow(insertAtRow: number, range: XLSX.Range): void {
    if (!this.worksheet) return;

    // Shift all rows below the insertion point down by one
    for (let row = range.e.r; row >= insertAtRow; row--) {
      for (let col = range.s.c; col <= range.e.c; col++) {
        const oldAddress = XLSX.utils.encode_cell({ r: row, c: col });
        const newAddress = XLSX.utils.encode_cell({ r: row + 1, c: col });
        
        if (this.worksheet[oldAddress]) {
          this.worksheet[newAddress] = { ...this.worksheet[oldAddress] };
          delete this.worksheet[oldAddress];
        }
      }
    }
  }

  /**
   * Fill a row with order line data
   */
  private fillRowWithLineData(
    rowIndex: number, 
    templateRow: { [col: number]: XLSX.CellObject }, 
    lineData: OrderData['tbl_ln_pedidos_rep'][0],
    range: XLSX.Range
  ): void {
    const lineReplacements: PlaceholderReplacements = {
      matricula: lineData.matricula_89,
      descripcion: lineData.descripcion,
      nenv: lineData.nenv,
      nsenv: lineData.nsenv || ''
    };

    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: col });
      
      // Copy the template cell if it exists
      if (templateRow[col]) {
        this.worksheet![cellAddress] = { ...templateRow[col] };
        
        const cell = this.worksheet![cellAddress];
        if (cell.v && typeof cell.v === 'string') {
          let cellValue = cell.v;
          
          // Replace placeholders in this cell
          Object.entries(lineReplacements).forEach(([key, value]) => {
            const placeholder = `{${key}}`;
            cellValue = cellValue.replace(new RegExp(placeholder, 'g'), String(value));
          });
          
          cell.v = cellValue;
          cell.w = cellValue;
        }
      }
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