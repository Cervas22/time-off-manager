export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17"
  }
  public: {
    Tables: {
      absence_periods: {
        Row: {
          category_id: string | null
          created_at: string
          employee_id: string
          empresa_id: string
          end_date: string
          end_time: string | null
          id: string
          label: string | null
          request_id: string | null
          start_date: string
          start_time: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          employee_id: string
          empresa_id?: string
          end_date: string
          end_time?: string | null
          id?: string
          label?: string | null
          request_id?: string | null
          start_date: string
          start_time?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          employee_id?: string
          empresa_id?: string
          end_date?: string
          end_time?: string | null
          id?: string
          label?: string | null
          request_id?: string | null
          start_date?: string
          start_time?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "absence_periods_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "request_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_periods_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_periods_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "absence_periods_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          description: string | null
          empresa_id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          empresa_id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          empresa_id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          created_at: string
          description: string | null
          empresa_id: string
          id: string
          is_active: boolean
          manager_user_id: string | null
          max_simultaneous_absences: number
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          empresa_id?: string
          id?: string
          is_active?: boolean
          manager_user_id?: string | null
          max_simultaneous_absences?: number
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          empresa_id?: string
          id?: string
          is_active?: boolean
          manager_user_id?: string | null
          max_simultaneous_absences?: number
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "areas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          empresa_id: string
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          empresa_id?: string
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          empresa_id?: string
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      balance_adjustments: {
        Row: {
          adjustment_type: Database["public"]["Enums"]["adjustment_type"]
          amount: number
          created_at: string
          created_by: string
          cycle_id: string | null
          employee_id: string
          empresa_id: string
          id: string
          new_balance: number
          previous_balance: number
          reason: string
        }
        Insert: {
          adjustment_type: Database["public"]["Enums"]["adjustment_type"]
          amount: number
          created_at?: string
          created_by: string
          cycle_id?: string | null
          employee_id: string
          empresa_id?: string
          id?: string
          new_balance: number
          previous_balance: number
          reason: string
        }
        Update: {
          adjustment_type?: Database["public"]["Enums"]["adjustment_type"]
          amount?: number
          created_at?: string
          created_by?: string
          cycle_id?: string | null
          employee_id?: string
          empresa_id?: string
          id?: string
          new_balance?: number
          previous_balance?: number
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "balance_adjustments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "vacation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_adjustments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balance_adjustments_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      codigos_activacion: {
        Row: {
          codigo: string
          created_at: string
          dias: number
          id: string
          nota: string | null
          usado_en: string | null
          usado_por: string | null
        }
        Insert: {
          codigo: string
          created_at?: string
          dias: number
          id?: string
          nota?: string | null
          usado_en?: string | null
          usado_por?: string | null
        }
        Update: {
          codigo?: string
          created_at?: string
          dias?: number
          id?: string
          nota?: string | null
          usado_en?: string | null
          usado_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "codigos_activacion_usado_por_fkey"
            columns: ["usado_por"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          accrue_expired_days: boolean
          area_id: string | null
          created_at: string
          email: string
          employee_number: string
          empresa_id: string
          full_name: string
          hire_date: string
          id: string
          is_active: boolean
          is_owner: boolean
          manager_user_id: string | null
          position: string | null
          schedule_template_id: string | null
          updated_at: string
          user_id: string | null
          work_days: number[]
        }
        Insert: {
          accrue_expired_days?: boolean
          area_id?: string | null
          created_at?: string
          email: string
          employee_number: string
          empresa_id?: string
          full_name: string
          hire_date: string
          id?: string
          is_active?: boolean
          is_owner?: boolean
          manager_user_id?: string | null
          position?: string | null
          schedule_template_id?: string | null
          updated_at?: string
          user_id?: string | null
          work_days?: number[]
        }
        Update: {
          accrue_expired_days?: boolean
          area_id?: string | null
          created_at?: string
          email?: string
          employee_number?: string
          empresa_id?: string
          full_name?: string
          hire_date?: string
          id?: string
          is_active?: boolean
          is_owner?: boolean
          manager_user_id?: string | null
          position?: string | null
          schedule_template_id?: string | null
          updated_at?: string
          user_id?: string | null
          work_days?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "employees_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employees_schedule_template_id_fkey"
            columns: ["schedule_template_id"]
            isOneToOne: false
            referencedRelation: "schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      empresas: {
        Row: {
          admin_user_id: string | null
          correo_contacto: string | null
          created_at: string
          estatus: string
          fecha_vencimiento: string
          id: string
          nombre: string
          rfc: string | null
          telefono: string | null
          updated_at: string
        }
        Insert: {
          admin_user_id?: string | null
          correo_contacto?: string | null
          created_at?: string
          estatus?: string
          fecha_vencimiento?: string
          id?: string
          nombre: string
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Update: {
          admin_user_id?: string | null
          correo_contacto?: string | null
          created_at?: string
          estatus?: string
          fecha_vencimiento?: string
          id?: string
          nombre?: string
          rfc?: string | null
          telefono?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      holidays: {
        Row: {
          created_at: string
          description: string | null
          empresa_id: string
          holiday_date: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          empresa_id?: string
          holiday_date: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          empresa_id?: string
          holiday_date?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "holidays_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          request_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          request_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          request_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_roles: {
        Row: {
          created_at: string
          email: string
          empresa_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          created_at?: string
          email: string
          empresa_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          created_at?: string
          email?: string
          empresa_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "pending_roles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      plataforma_cobro: {
        Row: {
          banco: string | null
          clabe: string | null
          correo: string | null
          id: number
          oxxo_tarjeta: string | null
          paypal_url: string | null
          precio_anual: string | null
          precio_mensual: string | null
          titular: string | null
          updated_at: string
          whatsapp: string | null
        }
        Insert: {
          banco?: string | null
          clabe?: string | null
          correo?: string | null
          id?: number
          oxxo_tarjeta?: string | null
          paypal_url?: string | null
          precio_anual?: string | null
          precio_mensual?: string | null
          titular?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Update: {
          banco?: string | null
          clabe?: string | null
          correo?: string | null
          id?: number
          oxxo_tarjeta?: string | null
          paypal_url?: string | null
          precio_anual?: string | null
          precio_mensual?: string | null
          titular?: string | null
          updated_at?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          empresa_id: string | null
          full_name: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string
          empresa_id?: string | null
          full_name?: string
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          empresa_id?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      request_categories: {
        Row: {
          code: string
          color: string
          created_at: string
          empresa_id: string
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          color?: string
          created_at?: string
          empresa_id?: string
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          color?: string
          created_at?: string
          empresa_id?: string
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_categories_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      request_types: {
        Row: {
          allows_days: boolean
          allows_hours: boolean
          category_id: string
          created_at: string
          deducts_vacation: boolean
          empresa_id: string
          id: string
          is_active: boolean
          max_days: number | null
          name: string
          requires_document: boolean
          updated_at: string
        }
        Insert: {
          allows_days?: boolean
          allows_hours?: boolean
          category_id: string
          created_at?: string
          deducts_vacation?: boolean
          empresa_id?: string
          id?: string
          is_active?: boolean
          max_days?: number | null
          name: string
          requires_document?: boolean
          updated_at?: string
        }
        Update: {
          allows_days?: boolean
          allows_hours?: boolean
          category_id?: string
          created_at?: string
          deducts_vacation?: boolean
          empresa_id?: string
          id?: string
          is_active?: boolean
          max_days?: number | null
          name?: string
          requires_document?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_types_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "request_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "request_types_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      requests: {
        Row: {
          admin_comment: string | null
          category_id: string | null
          created_at: string
          cycle_id: string | null
          days_count: number
          document_path: string | null
          employee_id: string
          empresa_id: string
          end_date: string
          end_time: string | null
          exception_reason: string | null
          hours_count: number
          id: string
          mode: Database["public"]["Enums"]["request_mode"]
          payment_date: string | null
          reason: string
          resolved_at: string | null
          resolved_by: string | null
          start_date: string
          start_time: string | null
          status: Database["public"]["Enums"]["request_status"]
          type_id: string | null
          updated_at: string
        }
        Insert: {
          admin_comment?: string | null
          category_id?: string | null
          created_at?: string
          cycle_id?: string | null
          days_count?: number
          document_path?: string | null
          employee_id: string
          empresa_id?: string
          end_date: string
          end_time?: string | null
          exception_reason?: string | null
          hours_count?: number
          id?: string
          mode?: Database["public"]["Enums"]["request_mode"]
          payment_date?: string | null
          reason: string
          resolved_at?: string | null
          resolved_by?: string | null
          start_date: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          type_id?: string | null
          updated_at?: string
        }
        Update: {
          admin_comment?: string | null
          category_id?: string | null
          created_at?: string
          cycle_id?: string | null
          days_count?: number
          document_path?: string | null
          employee_id?: string
          empresa_id?: string
          end_date?: string
          end_time?: string | null
          exception_reason?: string | null
          hours_count?: number
          id?: string
          mode?: Database["public"]["Enums"]["request_mode"]
          payment_date?: string | null
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
          start_date?: string
          start_time?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requests_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "request_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "vacation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requests_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "request_types"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_days: {
        Row: {
          break_end: string | null
          break_start: string | null
          crosses_midnight: boolean
          empresa_id: string
          end_time: string | null
          id: string
          is_working_day: boolean
          lunch_minutes: number
          start_time: string | null
          template_id: string
          weekday: number
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          crosses_midnight?: boolean
          empresa_id?: string
          end_time?: string | null
          id?: string
          is_working_day?: boolean
          lunch_minutes?: number
          start_time?: string | null
          template_id: string
          weekday: number
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          crosses_midnight?: boolean
          empresa_id?: string
          end_time?: string | null
          id?: string
          is_working_day?: boolean
          lunch_minutes?: number
          start_time?: string | null
          template_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "schedule_days_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_days_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "schedule_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_templates: {
        Row: {
          created_at: string
          description: string | null
          empresa_id: string
          id: string
          is_active: boolean
          is_night_shift: boolean
          is_rotating: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          empresa_id?: string
          id?: string
          is_active?: boolean
          is_night_shift?: boolean
          is_rotating?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          empresa_id?: string
          id?: string
          is_active?: boolean
          is_night_shift?: boolean
          is_rotating?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_templates_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      seniority_rules: {
        Row: {
          created_at: string
          days: number
          effective_from: string
          empresa_id: string
          id: string
          is_active: boolean
          notes: string | null
          updated_at: string
          year_from: number
          year_to: number | null
        }
        Insert: {
          created_at?: string
          days: number
          effective_from?: string
          empresa_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          year_from: number
          year_to?: number | null
        }
        Update: {
          created_at?: string
          days?: number
          effective_from?: string
          empresa_id?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          year_from?: number
          year_to?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seniority_rules_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vacation_cycles: {
        Row: {
          accrue_expired: boolean
          anniversary_date: string
          assigned_days: number
          created_at: string
          cycle_end: string
          cycle_start: string
          employee_id: string
          empresa_id: string
          expired_days: number
          id: string
          seniority_years: number
          status: Database["public"]["Enums"]["cycle_status"]
          taken_days: number
          updated_at: string
        }
        Insert: {
          accrue_expired?: boolean
          anniversary_date: string
          assigned_days?: number
          created_at?: string
          cycle_end: string
          cycle_start: string
          employee_id: string
          empresa_id?: string
          expired_days?: number
          id?: string
          seniority_years: number
          status?: Database["public"]["Enums"]["cycle_status"]
          taken_days?: number
          updated_at?: string
        }
        Update: {
          accrue_expired?: boolean
          anniversary_date?: string
          assigned_days?: number
          created_at?: string
          cycle_end?: string
          cycle_start?: string
          employee_id?: string
          empresa_id?: string
          expired_days?: number
          id?: string
          seniority_years?: number
          status?: Database["public"]["Enums"]["cycle_status"]
          taken_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_cycles_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_cycles_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vacation_payments: {
        Row: {
          created_at: string
          created_by: string | null
          cycle_id: string | null
          employee_id: string
          empresa_id: string
          id: string
          payment_date: string
          request_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          cycle_id?: string | null
          employee_id: string
          empresa_id?: string
          id?: string
          payment_date: string
          request_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          cycle_id?: string | null
          employee_id?: string
          empresa_id?: string
          id?: string
          payment_date?: string
          request_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vacation_payments_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "vacation_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_payments_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vacation_payments_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "requests"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_role: {
        Args: {
          _email: string
          _grant: boolean
          _role: Database["public"]["Enums"]["app_role"]
        }
        Returns: string
      }
      canjear_codigo: { Args: { _codigo: string }; Returns: string }
      employee_area: { Args: { _employee_id: string }; Returns: string }
      empresa_vigente_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_superadmin: { Args: never; Returns: boolean }
      manages_area: { Args: { _area_id: string }; Returns: boolean }
      my_area_id: { Args: never; Returns: string }
      my_employee_id: { Args: never; Returns: string }
      my_empresa_id: { Args: never; Returns: string }
      owns_employee: { Args: { _employee_id: string }; Returns: boolean }
      registrar_empresa: {
        Args: { _nombre: string; _rfc: string; _telefono: string }
        Returns: string
      }
      superadmin_empresas: {
        Args: never
        Returns: {
          admin_email: string
          correo_contacto: string
          created_at: string
          empleados: number
          estatus: string
          fecha_vencimiento: string
          id: string
          nombre: string
          rfc: string
          telefono: string
        }[]
      }
    }
    Enums: {
      adjustment_type:
        | "incremento"
        | "decremento"
        | "restauracion_vencidos"
        | "correccion"
      app_role: "admin" | "jefe" | "empleado"
      cycle_status: "vigente" | "cerrado" | "vencido"
      payment_status: "programado" | "pagado" | "cancelado"
      request_mode:
        | "dias_completos"
        | "horas"
        | "entrada_tardia"
        | "salida_anticipada"
      request_status:
        | "pendiente"
        | "aprobada"
        | "rechazada"
        | "cancelada"
        | "modificada_aprobada"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      adjustment_type: [
        "incremento",
        "decremento",
        "restauracion_vencidos",
        "correccion",
      ],
      app_role: ["admin", "jefe", "empleado"],
      cycle_status: ["vigente", "cerrado", "vencido"],
      payment_status: ["programado", "pagado", "cancelado"],
      request_mode: [
        "dias_completos",
        "horas",
        "entrada_tardia",
        "salida_anticipada",
      ],
      request_status: [
        "pendiente",
        "aprobada",
        "rechazada",
        "cancelada",
        "modificada_aprobada",
      ],
    },
  },
} as const
