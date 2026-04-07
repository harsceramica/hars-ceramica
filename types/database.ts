export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      product_categories: {
        Row: {
          id: string;
          name: string;
          default_cost: number;
          default_price: number;
          package_size: number | null;
          bulk_discount_1_min_qty: number | null;
          bulk_discount_1_percent: number | null;
          bulk_discount_2_min_qty: number | null;
          bulk_discount_2_percent: number | null;
        };
        Insert: {
          id?: string;
          name: string;
          default_cost?: number;
          default_price?: number;
          package_size?: number | null;
          bulk_discount_1_min_qty?: number | null;
          bulk_discount_1_percent?: number | null;
          bulk_discount_2_min_qty?: number | null;
          bulk_discount_2_percent?: number | null;
        };
        Update: {
          id?: string;
          name?: string;
          default_cost?: number;
          default_price?: number;
          package_size?: number | null;
          bulk_discount_1_min_qty?: number | null;
          bulk_discount_1_percent?: number | null;
          bulk_discount_2_min_qty?: number | null;
          bulk_discount_2_percent?: number | null;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          name: string;
          address: string | null;
          province: string | null;
          phone: string | null;
          payment_method: string | null;
          purchase_channel: string | null;
          products_of_interest: string | null;
          total_spent: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          address?: string | null;
          province?: string | null;
          phone?: string | null;
          payment_method?: string | null;
          purchase_channel?: string | null;
          products_of_interest?: string | null;
          total_spent?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          province?: string | null;
          phone?: string | null;
          payment_method?: string | null;
          purchase_channel?: string | null;
          products_of_interest?: string | null;
          total_spent?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          name: string;
          category_id: string;
          unit: string;
          current_stock: number;
          min_stock: number;
          cost: number;
          price: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category_id: string;
          unit?: string;
          current_stock?: number;
          min_stock?: number;
          cost?: number;
          price?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category_id?: string;
          unit?: string;
          current_stock?: number;
          min_stock?: number;
          cost?: number;
          price?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "product_categories";
            referencedColumns: ["id"];
          }
        ];
      };
      sales: {
        Row: {
          id: string;
          product_id: string;
          customer_id: string | null;
          status:
            | "pendiente_de_pago"
            | "pendiente"
            | "pagado"
            | "por_despachar"
            | "despachado"
            | "entregado"
            | "cancelado";
          quantity: number;
          unit_price: number;
          discount_percent: number;
          total: number;
          cost: number;
          profit: number;
          customer: string | null;
          channel: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          customer_id?: string | null;
          status?:
            | "pendiente_de_pago"
            | "pendiente"
            | "pagado"
            | "por_despachar"
            | "despachado"
            | "entregado"
            | "cancelado";
          quantity: number;
          unit_price: number;
          discount_percent?: number;
          total: number;
          cost: number;
          profit: number;
          customer?: string | null;
          channel?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          customer_id?: string | null;
          status?:
            | "pendiente_de_pago"
            | "pendiente"
            | "pagado"
            | "por_despachar"
            | "despachado"
            | "entregado"
            | "cancelado";
          quantity?: number;
          unit_price?: number;
          discount_percent?: number;
          total?: number;
          cost?: number;
          profit?: number;
          customer?: string | null;
          channel?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sales_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          }
        ];
      };
      stock_movements: {
        Row: {
          id: string;
          product_id: string;
          type: "entrada" | "salida" | "ajuste";
          quantity: number;
          note: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          type: "entrada" | "salida" | "ajuste";
          quantity: number;
          note?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          product_id?: string;
          type?: "entrada" | "salida" | "ajuste";
          quantity?: number;
          note?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "stock_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      expenses: {
        Row: {
          id: string;
          concept: string;
          category: string;
          amount: number;
          payment_method: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          concept: string;
          category: string;
          amount: number;
          payment_method?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          concept?: string;
          category?: string;
          amount?: number;
          payment_method?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      create_sale: {
        Args: {
          p_product_id: string;
          p_quantity: number;
          p_unit_price: number;
          p_customer_id?: string | null;
          p_status?:
            | "pendiente_de_pago"
            | "pendiente"
            | "pagado"
            | "por_despachar"
            | "despachado"
            | "entregado"
            | "cancelado";
          p_customer?: string | null;
          p_channel?: string | null;
          p_created_at?: string;
        };
        Returns: Database["public"]["Tables"]["sales"]["Row"];
      };
      delete_sale_and_restore_stock: {
        Args: {
          p_sale_id: string;
        };
        Returns: void;
      };
      create_stock_movement: {
        Args: {
          p_product_id: string;
          p_type: "entrada" | "salida" | "ajuste";
          p_quantity: number;
          p_note?: string | null;
          p_created_at?: string;
        };
        Returns: Database["public"]["Tables"]["stock_movements"]["Row"];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
