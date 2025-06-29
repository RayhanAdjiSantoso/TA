-- Tabel metadata
CREATE TABLE metadata (
    id_metadata SERIAL PRIMARY KEY,
    nama_tabel VARCHAR(100) NOT NULL, -- Nama tabel SQL (tanpa spasi)
    judul VARCHAR(100) NOT NULL,      -- Nama tabel untuk ditampilkan ke user
    deskripsi TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);   

-- Tabel kolom_definisi
-- Menyimpan struktur kolom untuk setiap tabel
CREATE TABLE kolom_definisi (
    id_kolom SERIAL PRIMARY KEY,
    id_metadata INTEGER NOT NULL,            -- Referensi ke tabel metadata
    nama_kolom VARCHAR(100) NOT NULL,        -- Nama kolom SQL
    judul_kolom VARCHAR(100) NOT NULL,       -- Nama kolom untuk ditampilkan ke user
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
    
    -- Foreign Key
    CONSTRAINT fk_kolom_metadata 
        FOREIGN KEY (id_metadata) 
        REFERENCES metadata(id_metadata) 
        ON DELETE CASCADE
);

-- Tabel untuk menyimpan hasil visualisasi
CREATE TABLE visualisasi (
    id_visualisasi SERIAL PRIMARY KEY,
    judul VARCHAR(100) NOT NULL,
    deskripsi TEXT,
    query_sql TEXT NOT NULL,
    jenis_grafik VARCHAR(20),
    parameter_x VARCHAR(100) NOT NULL,
    parameter_y VARCHAR(100) NOT NULL,
    group_by VARCHAR(100),
    chart_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel junction untuk relasi many-to-many antara visualisasi dan metadata
CREATE TABLE visualisasi_metadata (
    id_visualisasi_metadata SERIAL PRIMARY KEY,
    id_visualisasi INTEGER NOT NULL,
    id_metadata INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_vis_metadata_visualisasi 
        FOREIGN KEY (id_visualisasi) 
        REFERENCES visualisasi(id_visualisasi) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_vis_metadata_metadata 
        FOREIGN KEY (id_metadata) 
        REFERENCES metadata(id_metadata) 
        ON DELETE CASCADE
);

-- Tabel analisis
CREATE TABLE analisis (
    id_analisis SERIAL PRIMARY KEY,
    judul VARCHAR(100) NOT NULL,
    masalah TEXT NOT NULL,
    interpretasi_hasil TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabel junction untuk relasi many-to-many antara analisis dan visualisasi
CREATE TABLE analisis_visualisasi (
    id_analisis_visualisasi SERIAL PRIMARY KEY,
    id_analisis INTEGER NOT NULL,
    id_visualisasi INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign Keys
    CONSTRAINT fk_analisis_vis_analisis 
        FOREIGN KEY (id_analisis) 
        REFERENCES analisis(id_analisis) 
        ON DELETE CASCADE,
    
    CONSTRAINT fk_analisis_vis_visualisasi 
        FOREIGN KEY (id_visualisasi) 
        REFERENCES visualisasi(id_visualisasi) 
        ON DELETE CASCADE
);

-- ========================================
-- CEK ISI TABEL
-- ========================================
SELECT * FROM metadata
SELECT * FROM kolom_definisi
SELECT * FROM visualisasi
SELECT * FROM visualisasi_metadata
SELECT * FROM analisis
SELECT * FROM analisis_visualisasi

-- ========================================
-- HAPUS TABEL
-- ========================================
DROP TABLE metadata
DROP TABLE kolom_definisi
DROP TABLE visualisasi
DROP TABLE visualisasi_metadata
DROP TABLE analisis
DROP TABLE analisis_visualisasi