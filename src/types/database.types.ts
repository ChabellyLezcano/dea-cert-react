export interface Database {
  public: {
    Tables: {
      question_progress: {
        Row: {
          id: string;
          user_id: string;
          question_id: string;
          ok: boolean;
          picked: number[];
          revealed: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          question_id: string;
          ok: boolean;
          picked: number[];
          revealed?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          question_id?: string;
          ok?: boolean;
          picked?: number[];
          revealed?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      questions: {
        Row: {
          id: string;
          cert_id: string;
          exam: number;
          n: number;
          domain: string;
          is_multi: boolean;
          question: string;
          options: string[];
          correct_answers: number[];
          explanation: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          cert_id: string;
          exam: number;
          n: number;
          domain: string;
          is_multi?: boolean;
          question: string;
          options: string[];
          correct_answers: number[];
          explanation: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cert_id?: string;
          exam?: number;
          n?: number;
          domain?: string;
          is_multi?: boolean;
          question?: string;
          options?: string[];
          correct_answers?: number[];
          explanation?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      glossary_terms: {
        Row: {
          id: number;
          cert_id: string;
          term: string;
          domain: string;
          definition: string;
          code_snippet: string | null;
          retired: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: number;
          cert_id: string;
          term: string;
          domain: string;
          definition: string;
          code_snippet?: string | null;
          retired?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: number;
          cert_id?: string;
          term?: string;
          domain?: string;
          definition?: string;
          code_snippet?: string | null;
          retired?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      study_topics: {
        Row: {
          id: string;
          cert_id: string;
          domain: string;
          topic_order: number;
          title: string;
          summary: string;
          content_md: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          cert_id: string;
          domain: string;
          topic_order: number;
          title: string;
          summary: string;
          content_md: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cert_id?: string;
          domain?: string;
          topic_order?: number;
          title?: string;
          summary?: string;
          content_md?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      certifications: {
        Row: {
          id: string;
          name: string;
          provider: string;
          exam_guide_version: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          provider: string;
          exam_guide_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          provider?: string;
          exam_guide_version?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      domains: {
        Row: {
          cert_id: string;
          code: string;
          name: string;
          weight: number;
          domain_order: number;
        };
        Insert: {
          cert_id: string;
          code: string;
          name: string;
          weight: number;
          domain_order: number;
        };
        Update: {
          cert_id?: string;
          code?: string;
          name?: string;
          weight?: number;
          domain_order?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
}
