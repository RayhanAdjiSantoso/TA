-- =====================================================
-- User dapat memasukkan jenis data apa saja
-- =====================================================

-- 1. KATALOG DATA (Master Catalog)
CREATE TABLE data (
    id_data SERIAL PRIMARY KEY,
    nama_tabel VARCHAR(100) NOT NULL UNIQUE, -- Nama tabel SQL (tanpa spasi)
    judul VARCHAR(100) NOT NULL,             -- Nama tabel untuk ditampilkan ke user
    deskripsi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Menyimpan struktur kolom untuk setiap tabel
CREATE TABLE kolom_definisi (
    id_kolom SERIAL PRIMARY KEY,
    id_katalog INTEGER NOT NULL,             -- Referensi ke tabel data
    nama_kolom VARCHAR(100) NOT NULL,        -- Nama kolom SQL
    judul_kolom VARCHAR(200) NOT NULL,       -- Label human-readable
    tipe_data VARCHAR(50) NOT NULL,          -- varchar, integer, numeric, etc.
    panjang_data INTEGER,                    -- Untuk varchar
    presisi INTEGER,                         -- Untuk numeric
    skala INTEGER,                           -- Untuk numeric
    is_nullable BOOLEAN DEFAULT TRUE,
    is_primary_key BOOLEAN DEFAULT FALSE,
    is_foreign_key BOOLEAN DEFAULT FALSE,
    tabel_referensi VARCHAR(100),            -- Jika foreign key
    kolom_referensi VARCHAR(100),            -- Jika foreign key
    nilai_default TEXT,
    deskripsi_kolom TEXT,
    urutan_kolom INTEGER NOT NULL,           -- Untuk urutan kolom saat generate
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_kolom_katalog
        FOREIGN KEY (id_katalog) REFERENCES data(id_data) ON DELETE CASCADE
);

-- Table untuk menyimpan hasil visualisasi
CREATE TABLE visualisasi (
    id_visualisasi SERIAL PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    jenis_grafik VARCHAR(50) NOT NULL,
    query_sql TEXT NOT NULL,
    berparameter BOOLEAN NOT NULL DEFAULT FALSE,
    katalog_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (katalog_id) REFERENCES data(id_data) ON DELETE CASCADE
);

-- Table untuk menyimpan parameter yang digunakan untuk membuat visualisasi
CREATE TABLE parameter_visualisasi (
    id_parameter SERIAL PRIMARY KEY,
    id_visualisasi INTEGER NOT NULL,
    parameter_x VARCHAR(100) NOT NULL,
    parameter_y VARCHAR(100) NOT NULL,
    group_by VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_visualisasi) REFERENCES visualisasi(id_visualisasi) ON DELETE CASCADE
);

-- Table untuk menyimpan analisis berdasarkan visualisasi
CREATE TABLE analisis (
    id_analisis SERIAL PRIMARY KEY,
    judul VARCHAR(100) NOT NULL,
    masalah TEXT,
    id_visualisasi INTEGER,
    id_parameter INTEGER,
    interpretasi_hasil TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_visualisasi) REFERENCES visualisasi(id_visualisasi) ON DELETE CASCADE,
    FOREIGN KEY (id_parameter) REFERENCES parameter_visualisasi(id_parameter) ON DELETE SET NULL
);