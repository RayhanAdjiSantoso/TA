-- ========================================
-- PEMBUATAN TABEL
-- ========================================

-- 1. PARENT TABLES (tidak ada dependency)

-- Table untuk unit_pemilik3.csv
CREATE TABLE unit_pemilik (
    business_name VARCHAR(10) PRIMARY KEY,
    name VARCHAR(100),
    kode_pemilik_penyewa VARCHAR(20),
    id_pemilik VARCHAR(20)
);

-- Table untuk master_unit_bersih.csv
CREATE TABLE master_unit (
    kode_unit VARCHAR(10) PRIMARY KEY,
    kode_tu VARCHAR(5),
    luas_unit INTEGER,
    floor INTEGER,
    tower VARCHAR(5),
    kode_unit2 VARCHAR(10)
);

-- 2. CHILD TABLES (dengan foreign keys)

-- Table untuk invoice_air.csv
CREATE TABLE invoice_air (
    id_invoice VARCHAR(30) PRIMARY KEY,
    contract_id VARCHAR(30),
    business_name VARCHAR(10),
    unit_code VARCHAR(10),
    duedate DATE,
    name VARCHAR(100),
    net NUMERIC(12, 2),
    vat NUMERIC(12, 2),
    total NUMERIC(12, 2),
    status VARCHAR(10),
    email VARCHAR(100),
    create_by VARCHAR(20),
    CONSTRAINT fk_invoice_air_unit_code 
        FOREIGN KEY (unit_code) REFERENCES master_unit(kode_unit),
    CONSTRAINT fk_invoice_air_business_name 
        FOREIGN KEY (business_name) REFERENCES unit_pemilik(business_name)
);

-- Table untuk pembayaran_air_lengkap_bersih2.csv
CREATE TABLE pembayaran_air (
    payment_id VARCHAR(30) PRIMARY KEY,
    payment_date DATE,
    posting_date DATE,
    contract_id VARCHAR(20),
    location VARCHAR(10),
    business_name VARCHAR(10),
    tenant VARCHAR(100),
    bank_account VARCHAR(50),
    payment_description VARCHAR(100),
    receipt_payment NUMERIC(12, 2),
    pay_by_advance NUMERIC(12, 2),
    other_expense NUMERIC(12, 2),
    other_income NUMERIC(12, 2),
    advance NUMERIC(12, 2),
    payment_penalty NUMERIC(12, 2),
    payment_type VARCHAR(20),
    status VARCHAR(10),
    CONSTRAINT fk_pembayaran_air_business_name 
        FOREIGN KEY (business_name) REFERENCES unit_pemilik(business_name)
);

-- Table untuk tagihan_air_bersih1.csv
-- buat id baru untuk primary key, karena contract_id dapat muncul lebih dari sekali
-- pada thbl semua nilai ditambahkan tanggal 1, untuk konsistensi format tanggal
CREATE TABLE tagihan_air (
    id_tagihan SERIAL PRIMARY KEY,
    contract_id VARCHAR(20),
    business_name VARCHAR(10),
    unit_code VARCHAR(10),
    start_meter NUMERIC(12, 2),
    end_meter NUMERIC(12, 2),
    qty INTEGER,
    tarif NUMERIC(12, 2),
    thbl DATE,
    CONSTRAINT fk_tagihan_air_unit_code 
        FOREIGN KEY (unit_code) REFERENCES master_unit(kode_unit),
    CONSTRAINT fk_tagihan_air_business_name 
        FOREIGN KEY (business_name) REFERENCES unit_pemilik(business_name)
);

-- Table untuk transaksi_listrik_bersih.csv
CREATE TABLE transaksi_listrik (
    cb_in_id VARCHAR(20) PRIMARY KEY,
    tanggal DATE,
    amount_in NUMERIC(12, 2),
    keterangan VARCHAR(100),
    posted_date DATE,
    unit VARCHAR(10),
    CONSTRAINT fk_transaksi_listrik_unit 
        FOREIGN KEY (unit) REFERENCES master_unit(kode_unit)
);

-- Table untuk menyimpan hasil visualisasi
CREATE TABLE visualisasi (
    id_visualisasi SERIAL PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    jenis_grafik VARCHAR(50) NOT NULL,
    query_sql TEXT NOT NULL,
    berparameter BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    chart_data TEXT
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

CREATE TABLE analisis_visualisasi (
  id_analisis_visualisasi SERIAL PRIMARY KEY,
  id_analisis INTEGER REFERENCES analisis(id_analisis) ON DELETE CASCADE,
  id_visualisasi INTEGER REFERENCES visualisasi(id_visualisasi) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW()
);


-- ========================================
-- CEK ISI TABEL
-- ========================================
SELECT * FROM invoice_air
SELECT * FROM master_unit
SELECT * FROM pembayaran_air
SELECT * FROM tagihan_air
SELECT * FROM transaksi_listrik
SELECT * FROM unit_pemilik
SELECT * FROM visualisasi
SELECT * FROM parameter_visualisasi
SELECT * FROM analisis
SELECT * FROM analisis_visualisasi


-- ========================================
-- HAPUS TABEL
-- ========================================
DROP TABLE invoice_air CASCADE;
DROP TABLE master_unit CASCADE;
DROP TABLE pembayaran_air CASCADE;
DROP TABLE tagihan_air CASCADE;
DROP TABLE transaksi_listrik CASCADE;
DROP TABLE unit_pemilik CASCADE;
DROP TABLE visualisasi
DROP TABLE parameter_visualisasi
DROP TABLE analisis
DROP TABLE analisis_visualisasi


-- ========================================
-- ANALISIS DATA YANG TIDAK KONSISTEN
-- ========================================
-- Karena saat pembuatan foreign key, ada data yang tidak terdaftar di master_unit.
-- Asumsi, seharusnya jika ada di tabel lain, maka harus terdaftar di master_unit

-- 1. Cek unit_code di invoice_air yang tidak ada di master_unit
SELECT DISTINCT unit_code, COUNT(*) as jumlah_record
FROM invoice_air 
WHERE unit_code NOT IN (SELECT kode_unit FROM master_unit WHERE kode_unit IS NOT NULL)
   OR unit_code IS NULL
GROUP BY unit_code 
ORDER BY jumlah_record DESC;

-- 2. Cek business_name di invoice_air yang tidak ada di unit_pemilik
SELECT DISTINCT business_name, COUNT(*) as jumlah_record
FROM invoice_air 
WHERE business_name NOT IN (SELECT business_name FROM unit_pemilik WHERE business_name IS NOT NULL)
   OR business_name IS NULL
GROUP BY business_name 
ORDER BY jumlah_record DESC;

-- 3. Cek business_name di pembayaran_air yang tidak ada di unit_pemilik
SELECT DISTINCT business_name, COUNT(*) as jumlah_record
FROM pembayaran_air 
WHERE business_name NOT IN (SELECT business_name FROM unit_pemilik WHERE business_name IS NOT NULL)
   OR business_name IS NULL
GROUP BY business_name 
ORDER BY jumlah_record DESC;

-- 4. Cek business_name di tagihan_air yang tidak ada di unit_pemilik
SELECT DISTINCT business_name, COUNT(*) as jumlah_record
FROM tagihan_air 
WHERE business_name NOT IN (SELECT business_name FROM unit_pemilik WHERE business_name IS NOT NULL)
   OR business_name IS NULL
GROUP BY business_name 
ORDER BY jumlah_record DESC;

-- 5. Cek unit di transaksi_listrik yang tidak ada di master_unit
SELECT DISTINCT unit, COUNT(*) as jumlah_record
FROM transaksi_listrik 
WHERE unit NOT IN (SELECT kode_unit FROM master_unit WHERE kode_unit IS NOT NULL)
   OR unit IS NULL
GROUP BY unit 
ORDER BY jumlah_record DESC;


-- ========================================
-- TAMBAHKAN DATA YANG HILANG KE master_unit
-- ========================================

INSERT INTO master_unit (kode_unit, kode_tu, luas_unit, floor, tower, kode_unit2)
SELECT DISTINCT unit_code, NULL::VARCHAR(5), NULL::INTEGER, NULL::INTEGER, NULL::VARCHAR(5), NULL::VARCHAR(10)
FROM invoice_air 
WHERE unit_code NOT IN (SELECT kode_unit FROM master_unit WHERE kode_unit IS NOT NULL)
  AND unit_code IS NOT NULL;

-- Tambahkan unit yang hilang ke master_unit (dari transaksi_listrik)
INSERT INTO master_unit (kode_unit, kode_tu, luas_unit, floor, tower, kode_unit2)
SELECT DISTINCT unit, NULL::VARCHAR(5), NULL::INTEGER, NULL::INTEGER, NULL::VARCHAR(5), NULL::VARCHAR(10)
FROM transaksi_listrik 
WHERE unit NOT IN (SELECT kode_unit FROM master_unit WHERE kode_unit IS NOT NULL)
  AND unit IS NOT NULL
  AND unit NOT IN (SELECT DISTINCT unit_code FROM invoice_air WHERE unit_code IS NOT NULL);

-- Tambahkan business_name yang hilang ke unit_pemilik
INSERT INTO unit_pemilik (business_name, name, kode_pemilik_penyewa, id_pemilik)
SELECT DISTINCT business_name, NULL::VARCHAR(100), NULL::VARCHAR(20), NULL::VARCHAR(20)
FROM (
    SELECT business_name FROM invoice_air WHERE business_name IS NOT NULL
    UNION
    SELECT business_name FROM pembayaran_air WHERE business_name IS NOT NULL
    UNION 
    SELECT business_name FROM tagihan_air WHERE business_name IS NOT NULL
) AS all_business_names
WHERE business_name NOT IN (SELECT business_name FROM unit_pemilik WHERE business_name IS NOT NULL);

-- cek roles
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin FROM pg_roles;



SELECT 
    tower,
    COUNT(*) as jumlah_unit
FROM master_unit
GROUP BY tower
ORDER BY jumlah_unit DESC

SELECT 
    contract_id,
    Business_Name,
    Unit_Code,
    qty as konsumsi_air,
    tarif,
    thbl as periode,
    CASE 
        WHEN qty = 0 THEN 'Tidak Ada Konsumsi'
        WHEN qty <= 5 THEN 'Konsumsi Rendah'
        WHEN qty <= 10 THEN 'Konsumsi Sedang'
        ELSE 'Konsumsi Tinggi'
    END as kategori_konsumsi
FROM tagihan_air
ORDER BY qty DESC


SELECT 
    Business_Name as unit,
    Unit_Code,
    SUM(qty) as total_konsumsi,
    AVG(qty) as rata_rata_konsumsi,
    COUNT(*) as jumlah_periode,
    SUM(tarif) as total_tarif,
    CASE 
        WHEN SUM(qty) = 0 THEN 'Tidak Ada Konsumsi'
        WHEN SUM(qty) <= 10 THEN 'Konsumsi Rendah'
        WHEN SUM(qty) <= 30 THEN 'Konsumsi Sedang'
        ELSE 'Konsumsi Tinggi'
    END as kategori_konsumsi
FROM tagihan_air
GROUP BY Business_Name, Unit_Code
ORDER BY total_konsumsi DESC

SELECT 
    DATE_FORMAT(STR_TO_DATE(Payment_Date, '%d/%m/%Y'), '%Y-%m') as bulan,
    COUNT(*) as jumlah_transaksi,
    SUM(CAST(REPLACE(REPLACE(Receipt_Payment, '.', ''), ',', '.') AS DECIMAL(15,2))) as total_pembayaran,
    AVG(CAST(REPLACE(REPLACE(Receipt_Payment, '.', ''), ',', '.') AS DECIMAL(15,2))) as rata_rata_pembayaran
FROM pembayaran_air_lengkap_bersih2
WHERE Payment_Date IS NOT NULL AND Payment_Date != ''
GROUP BY DATE_FORMAT(STR_TO_DATE(Payment_Date, '%d/%m/%Y'), '%Y-%m')
ORDER BY bulan


-- Analisis Transaksi Token Listrik per Unit
-- =====================================================
SELECT 
    unit,
    COUNT(*) as jumlah_transaksi,
    SUM(amount_in) as total_pembelian,
    AVG(amount_in) as rata_rata_pembelian,
    MAX(amount_in) as pembelian_tertinggi,
    MIN(amount_in) as pembelian_terendah
FROM transaksi_listrik
GROUP BY unit
ORDER BY total_pembelian DESC