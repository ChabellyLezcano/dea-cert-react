export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      certifications: {
        Row: {
          created_at: string;
          exam_guide_version: string | null;
          id: string;
          name: string;
          provider: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          exam_guide_version?: string | null;
          id: string;
          name: string;
          provider: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          exam_guide_version?: string | null;
          id?: string;
          name?: string;
          provider?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      domains: {
        Row: {
          cert_id: string;
          code: string;
          domain_order: number;
          name: string;
          weight: number;
        };
        Insert: {
          cert_id: string;
          code: string;
          domain_order: number;
          name: string;
          weight: number;
        };
        Update: {
          cert_id?: string;
          code?: string;
          domain_order?: number;
          name?: string;
          weight?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'domains_cert_id_fkey';
            columns: ['cert_id'];
            isOneToOne: false;
            referencedRelation: 'certifications';
            referencedColumns: ['id'];
          },
        ];
      };
      favorite_ai_questions: {
        Row: {
          cert_id: string;
          correct_answers: number[];
          created_at: string;
          domain: string;
          explanation_en: string;
          explanation_es: string | null;
          generated_by: string;
          id: string;
          is_multi: boolean;
          options_en: Json;
          options_es: Json | null;
          question_en: string;
          question_es: string | null;
          source_topic_ids: string[];
          user_id: string;
        };
        Insert: {
          cert_id: string;
          correct_answers: number[];
          created_at?: string;
          domain: string;
          explanation_en: string;
          explanation_es?: string | null;
          generated_by?: string;
          id?: string;
          is_multi?: boolean;
          options_en: Json;
          options_es?: Json | null;
          question_en: string;
          question_es?: string | null;
          source_topic_ids?: string[];
          user_id: string;
        };
        Update: {
          cert_id?: string;
          correct_answers?: number[];
          created_at?: string;
          domain?: string;
          explanation_en?: string;
          explanation_es?: string | null;
          generated_by?: string;
          id?: string;
          is_multi?: boolean;
          options_en?: Json;
          options_es?: Json | null;
          question_en?: string;
          question_es?: string | null;
          source_topic_ids?: string[];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'favorite_ai_questions_cert_id_domain_fkey';
            columns: ['cert_id', 'domain'];
            isOneToOne: false;
            referencedRelation: 'domains';
            referencedColumns: ['cert_id', 'code'];
          },
          {
            foreignKeyName: 'favorite_ai_questions_cert_id_fkey';
            columns: ['cert_id'];
            isOneToOne: false;
            referencedRelation: 'certifications';
            referencedColumns: ['id'];
          },
        ];
      };
      question_progress: {
        Row: {
          id: string;
          ok: boolean;
          picked: number[];
          question_id: string;
          revealed: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          id?: string;
          ok?: boolean;
          picked?: number[];
          question_id: string;
          revealed?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          id?: string;
          ok?: boolean;
          picked?: number[];
          question_id?: string;
          revealed?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'question_progress_question_id_fkey';
            columns: ['question_id'];
            isOneToOne: false;
            referencedRelation: 'questions';
            referencedColumns: ['id'];
          },
        ];
      };
      questions: {
        Row: {
          cert_id: string;
          correct_answers: number[];
          created_at: string;
          domain: string;
          exam: number;
          explanation_en: string | null;
          explanation_es: string;
          id: string;
          is_multi: boolean;
          n: number;
          options_en: Json;
          options_es: Json | null;
          question_en: string;
          question_es: string | null;
          updated_at: string;
        };
        Insert: {
          cert_id: string;
          correct_answers: number[];
          created_at?: string;
          domain: string;
          exam: number;
          explanation_en?: string | null;
          explanation_es: string;
          id: string;
          is_multi?: boolean;
          n: number;
          options_en: Json;
          options_es?: Json | null;
          question_en: string;
          question_es?: string | null;
          updated_at?: string;
        };
        Update: {
          cert_id?: string;
          correct_answers?: number[];
          created_at?: string;
          domain?: string;
          exam?: number;
          explanation_en?: string | null;
          explanation_es?: string;
          id?: string;
          is_multi?: boolean;
          n?: number;
          options_en?: Json;
          options_es?: Json | null;
          question_en?: string;
          question_es?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'questions_cert_id_fkey';
            columns: ['cert_id'];
            isOneToOne: false;
            referencedRelation: 'certifications';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'questions_domain_fkey';
            columns: ['cert_id', 'domain'];
            isOneToOne: false;
            referencedRelation: 'domains';
            referencedColumns: ['cert_id', 'code'];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    keyof (DefaultSchema['Tables'] & DefaultSchema['Views']) | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
