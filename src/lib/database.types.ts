export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      tbl_pedidos_rep: {
        Row: {
          id: string
          num_pedido: string
          alm_envia: string
          proveedor_id: string
          vehiculo: string
          garantia: boolean
          informacion_nc: string | null
          fecha_desmonte: string
          fecha_envio: string
          averia_declarada: string | null
          documentacion: string[] | null
          enviado_sin_garantia: boolean
          created_at: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          num_pedido: string
          alm_envia: string
          proveedor_id: string
          vehiculo: string
          garantia?: boolean
          informacion_nc?: string | null
          fecha_desmonte: string
          fecha_envio: string
          averia_declarada?: string | null
          documentacion?: string[] | null
          enviado_sin_garantia?: boolean
          created_at?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          num_pedido?: string
          alm_envia?: string
          proveedor_id?: string
          vehiculo?: string
          garantia?: boolean
          informacion_nc?: string | null
          fecha_desmonte?: string
          fecha_envio?: string
          averia_declarada?: string | null
          documentacion?: string[] | null
          enviado_sin_garantia?: boolean
          created_at?: string
          updated_at?: string | null
          user_id?: string | null
        }
      }
      tbl_ln_pedidos_rep: {
        Row: {
          id: string
          pedido_id: string
          matricula_89: string
          descripcion: string | null
          nenv: number
          nsenv: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          pedido_id: string
          matricula_89: string
          descripcion?: string | null
          nenv?: number
          nsenv?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          pedido_id?: string
          matricula_89?: string
          descripcion?: string | null
          nenv?: number
          nsenv?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      tbl_historico_cambios: {
        Row: {
          id: string
          pedido_id: string
          descripcion_cambio: string
          usuario: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pedido_id: string
          descripcion_cambio: string
          usuario?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          pedido_id?: string
          descripcion_cambio?: string
          usuario?: string | null
          created_at?: string
        }
      }
      tbl_proveedores: {
        Row: {
          id: string
          nombre: string
          direccion: string | null
          ciudad: string | null
          codigo_postal: string | null
          provincia: string | null
          telefono: string | null
          email: string | null
          persona_contacto: string | null
          es_externo: boolean | null
          notas: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          nombre: string
          direccion?: string | null
          ciudad?: string | null
          codigo_postal?: string | null
          provincia?: string | null
          telefono?: string | null
          email?: string | null
          persona_contacto?: string | null
          es_externo?: boolean | null
          notas?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          nombre?: string
          direccion?: string | null
          ciudad?: string | null
          codigo_postal?: string | null
          provincia?: string | null
          telefono?: string | null
          email?: string | null
          persona_contacto?: string | null
          es_externo?: boolean | null
          notas?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      tbl_recepciones: {
        Row: {
          id: string
          pedido_id: string
          linea_pedido_id: string
          fecha_recepcion: string
          estado_recepcion: string
          n_rec: number
          ns_rec: string
          observaciones: string
          garantia_aceptada_proveedor: boolean | null
          motivo_rechazo_garantia: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          pedido_id: string
          linea_pedido_id: string
          fecha_recepcion?: string
          estado_recepcion: string
          n_rec: number
          ns_rec?: string
          observaciones?: string
          garantia_aceptada_proveedor?: boolean | null
          motivo_rechazo_garantia?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          pedido_id?: string
          linea_pedido_id?: string
          fecha_recepcion?: string
          estado_recepcion?: string
          n_rec?: number
          ns_rec?: string
          observaciones?: string
          garantia_aceptada_proveedor?: boolean | null
          motivo_rechazo_garantia?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
    }
  }
}