import type { LedgerData } from "../types";

export interface Database {
  public: {
    Tables: {
      user_ledgers: {
        Row: {
          user_id: string;
          data: LedgerData;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          data: LedgerData;
        };
        Update: {
          data?: LedgerData;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
