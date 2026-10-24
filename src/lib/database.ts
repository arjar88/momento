export type WeeklyGoal = 1 | 2 | 3 | null;
export type AlbumStatus = 'open' | 'finished';
export type MemberRole = 'owner' | 'member';

export type Profile = {
  id: string;
  display_name: string;
  weekly_goal: WeeklyGoal;
  reminder_enabled: boolean;
  reminder_weekdays: number[];
  reminder_time: string;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
};

export type Album = {
  id: string;
  owner_id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: AlbumStatus;
  created_at: string;
  updated_at: string;
};

export type AlbumMember = {
  album_id: string;
  user_id: string;
  role: MemberRole;
  created_at: string;
};

export type AlbumInvite = {
  id: string;
  album_id: string;
  email: string;
  invited_by: string;
  created_at: string;
};

export type Memory = {
  id: string;
  album_id: string;
  author_id: string;
  taken_on: string;
  caption: string;
  storage_path: string;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          display_name?: string;
          weekly_goal?: WeeklyGoal;
          reminder_enabled?: boolean;
          reminder_weekdays?: number[];
          reminder_time?: string;
          onboarding_complete?: boolean;
        };
        Update: {
          display_name?: string;
          weekly_goal?: WeeklyGoal;
          reminder_enabled?: boolean;
          reminder_weekdays?: number[];
          reminder_time?: string;
          onboarding_complete?: boolean;
        };
        Relationships: [];
      };
      albums: {
        Row: Album;
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          start_date: string;
          end_date: string;
          status?: AlbumStatus;
        };
        Update: {
          name?: string;
          start_date?: string;
          end_date?: string;
          status?: AlbumStatus;
        };
        Relationships: [];
      };
      album_members: {
        Row: AlbumMember;
        Insert: {
          album_id: string;
          user_id: string;
          role: MemberRole;
        };
        Update: {
          role?: MemberRole;
        };
        Relationships: [];
      };
      album_invites: {
        Row: AlbumInvite;
        Insert: {
          id?: string;
          album_id: string;
          email: string;
          invited_by: string;
        };
        Update: {
          email?: string;
        };
        Relationships: [];
      };
      memories: {
        Row: Memory;
        Insert: {
          id?: string;
          album_id: string;
          author_id: string;
          taken_on: string;
          caption?: string;
          storage_path: string;
        };
        Update: {
          taken_on?: string;
          caption?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      profile_names: {
        Row: {
          id: string;
          display_name: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      delete_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
      delete_memory: {
        Args: { memory_id: string };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
