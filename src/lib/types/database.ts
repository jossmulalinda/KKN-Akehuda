export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "superadmin" | "admin_kos";
export type JenisKelamin = "laki_laki" | "perempuan";
export type StatusPekerjaan = "mahasiswa" | "pekerja" | "lainnya";
export type StatusKamar = "aktif" | "kosong";
export type HubunganPenghuni =
  | "suami_istri"
  | "saudara"
  | "teman"
  | "kerabat"
  | "lainnya";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          role: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      kosan: {
        Row: {
          id: string;
          nama: string;
          alamat: string;
          pemilik_id: string;
          kode_unik: string;
          latitude: number | null;
          longitude: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nama: string;
          alamat: string;
          pemilik_id: string;
          kode_unik?: string;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nama?: string;
          alamat?: string;
          pemilik_id?: string;
          kode_unik?: string;
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      kamar: {
        Row: {
          id: string;
          nomor_kamar: string;
          kosan_id: string;
          jumlah_penghuni: number;
          hubungan: HubunganPenghuni | null;
          status: StatusKamar;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nomor_kamar: string;
          kosan_id: string;
          jumlah_penghuni?: number;
          hubungan?: HubunganPenghuni | null;
          status?: StatusKamar;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nomor_kamar?: string;
          kosan_id?: string;
          jumlah_penghuni?: number;
          hubungan?: HubunganPenghuni | null;
          status?: StatusKamar;
          created_at?: string;
          updated_at?: string;
        };
      };
      penghuni: {
        Row: {
          id: string;
          kamar_id: string;
          kosan_id: string;
          nama_lengkap: string;
          tempat_lahir: string;
          tanggal_lahir: string;
          asal_daerah: string;
          jenis_kelamin: JenisKelamin;
          no_hp: string;
          status_pekerjaan: StatusPekerjaan;
          foto_url: string | null;
          is_primary: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kamar_id: string;
          kosan_id: string;
          nama_lengkap: string;
          tempat_lahir: string;
          tanggal_lahir: string;
          asal_daerah: string;
          jenis_kelamin: JenisKelamin;
          no_hp: string;
          status_pekerjaan: StatusPekerjaan;
          foto_url?: string | null;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kamar_id?: string;
          kosan_id?: string;
          nama_lengkap?: string;
          tempat_lahir?: string;
          tanggal_lahir?: string;
          asal_daerah?: string;
          jenis_kelamin?: JenisKelamin;
          no_hp?: string;
          status_pekerjaan?: StatusPekerjaan;
          foto_url?: string | null;
          is_primary?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      password_resets: {
        Row: {
          id: string;
          email: string;
          nama: string | null;
          no_hp: string | null;
          keterangan: string | null;
          status: "pending" | "selesai";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          nama?: string | null;
          no_hp?: string | null;
          keterangan?: string | null;
          status?: "pending" | "selesai";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nama?: string | null;
          no_hp?: string | null;
          keterangan?: string | null;
          status?: "pending" | "selesai";
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Kosan = Database["public"]["Tables"]["kosan"]["Row"];
export type Kamar = Database["public"]["Tables"]["kamar"]["Row"];
export type Penghuni = Database["public"]["Tables"]["penghuni"]["Row"];
export type PasswordReset = Database["public"]["Tables"]["password_resets"]["Row"];

// Extended types with relations
export type KosanWithPemilik = Kosan & {
  profiles: Profile;
};

export type KamarWithPenghuni = Kamar & {
  penghuni: Penghuni[];
};

export type KosanFull = Kosan & {
  profiles: Profile;
  kamar: KamarWithPenghuni[];
};
