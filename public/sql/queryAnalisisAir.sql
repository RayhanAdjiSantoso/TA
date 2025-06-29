-- =====================================================
-- Unit-unit yang menggunakan air lebih dari SNI di Rusunami Jarrdin@Cihampelas
-- =====================================================
SELECT 
    t.Business_Name,
    t.Unit_Code,
    t.qty as penggunaan_air_m3,
    t.thbl as periode,
    m.luas_unit,
    (t.qty / 30) as rata_rata_harian_m3,
    CASE 
        WHEN (t.qty / 30) > 0.1 THEN 'Melebihi SNI'
        ELSE 'Normal'
    END as status_sni
FROM tagihan_air t
LEFT JOIN master_unit m ON t.Unit_Code = m.kode_unit2
WHERE t.qty > 0
-- Jenis Grafik: Bar Chart
-- Sumbu X: Business_Name (Unit)
-- Sumbu Y: rata_rata_harian_m3
-- Group By: status_sni (Normal vs Melebihi SNI)

-- =====================================================
-- Unit-unit yang menggunakan listrik lebih dari SNI di Rusunami Jarrdin@Cihampelas
-- =====================================================
SELECT 
    tr.unit,
    SUM(tr.amount_in) as total_listrik_rupiah,
    m.luas_unit,
    COUNT(*) as jumlah_transaksi,
    EXTRACT(YEAR FROM tr.tanggal::date) as tahun,
    -- Asumsi 1 kWh = Rp 1.500 (perlu disesuaikan)
    (SUM(tr.amount_in) / 1500) as estimasi_kwh,
    ((SUM(tr.amount_in) / 1500) / m.luas_unit) as kwh_per_m2,
    CASE 
        WHEN ((SUM(tr.amount_in) / 1500) / m.luas_unit) > 300 THEN 'Melebihi SNI'
        ELSE 'Normal'
    END as status_sni
FROM transaksi_listrik tr
LEFT JOIN master_unit m ON tr.unit = m.kode_unit2
WHERE m.luas_unit > 0
GROUP BY tr.unit, tahun, m.luas_unit
-- Jenis Grafik: Scatter Plot
-- Sumbu X: luas_unit
-- Sumbu Y: kwh_per_m2
-- Group By: status_sni (Normal vs Melebihi SNI)

-- =====================================================
-- Unit-unit yang menggunakan air lebih dari pesebaran data di Rusunami Jarrdin@Cihampelas
-- =====================================================
WITH stats AS (
    SELECT 
        AVG(qty) as mean_qty,
        STDDEV(qty) as std_qty,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY qty) as q1,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY qty) as q3
    FROM tagihan_air
    WHERE qty > 0
),
outlier_bounds AS (
    SELECT 
        q1 - 1.5 * (q3 - q1) as lower_bound,
        q3 + 1.5 * (q3 - q1) as upper_bound
    FROM stats
)
SELECT 
    t.Business_Name,
    t.Unit_Code,
    t.qty,
    t.thbl,
    CASE 
        WHEN t.qty < o.lower_bound OR t.qty > o.upper_bound THEN 'Outlier'
        ELSE 'Normal'
    END as status_outlier
FROM tagihan_air t
CROSS JOIN outlier_bounds o
WHERE t.qty > 0
ORDER BY t.qty DESC
-- Jenis Grafik: Box Plot (atau Bar Chart jika box plot tidak tersedia)
-- Sumbu X: Unit_Code
-- Sumbu Y: qty (penggunaan air)
-- Group By: status_outlier (Normal vs Outlier)

-- =====================================================
-- Unit-unit yang menggunakan listrik lebih dari pesebaran data di Rusunami Jarrdin@Cihampelas
-- =====================================================
WITH monthly_usage AS (
    SELECT 
        unit,
        TO_CHAR(tanggal, 'YYYY-MM') as bulan,
        SUM(amount_in) as total_bulanan
    FROM transaksi_listrik
    GROUP BY unit, TO_CHAR(tanggal, 'YYYY-MM')
),
stats AS (
    SELECT 
        AVG(total_bulanan) as mean_usage,
        STDDEV(total_bulanan) as std_usage,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY total_bulanan) as q1,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY total_bulanan) as q3
    FROM monthly_usage
),
outlier_bounds AS (
    SELECT 
        q1 - 1.5 * (q3 - q1) as lower_bound,
        q3 + 1.5 * (q3 - q1) as upper_bound
    FROM stats
)
SELECT 
    m.unit,
    m.bulan,
    m.total_bulanan,
    CASE 
        WHEN m.total_bulanan < o.lower_bound OR m.total_bulanan > o.upper_bound THEN 'Outlier'
        ELSE 'Normal'
    END as status_outlier
FROM monthly_usage m
CROSS JOIN outlier_bounds o
ORDER BY m.total_bulanan DESC
-- Jenis Grafik: Scatter Plot
-- Sumbu X: bulan
-- Sumbu Y: total_bulanan
-- Group By: status_outlier (Normal vs Outlier)

-- =====================================================
-- Penggunaan listrik untuk unit-unit yang diasumsikan unit kosong di Rusunami Jarrdin@Cihampelas
-- =====================================================
SELECT 
    t.unit,
    TO_CHAR(t.tanggal, 'MM-YYYY') as bulan,
    SUM(t.amount_in) as penggunaan_listrik,
    up.Name as nama_pemilik,
    'Unit Kosong' as status_unit
FROM transaksi_listrik t
LEFT JOIN unit_pemilik up ON t.unit = up.Business_Name
WHERE t.unit NOT IN (
    SELECT DISTINCT Unit_Code 
    FROM tagihan_air
    WHERE qty > 0
)
GROUP BY t.unit, bulan, up.Name
ORDER BY bulan, penggunaan_listrik DESC
-- Jenis Grafik: Line Chart
-- Sumbu X: bulan
-- Sumbu Y: penggunaan_listrik
-- Group By: unit

-- =====================================================
-- Unit dengan riwayat tunggakan
-- =====================================================
S
SELECT 
    TO_CHAR(i.Duedate, 'YYYY-MM') as bulan_jatuh_tempo,
    
    -- Hitung unit yang terlambat bayar (belum bayar atau bayar setelah due date)
    COUNT(CASE 
        WHEN p.Payment_Date IS NULL THEN 1
        WHEN p.Payment_Date > i.Duedate THEN 1
    END) as unit_terlambat,
    
    -- Hitung unit yang bayar tepat waktu (bayar sebelum atau pada due date)
    COUNT(CASE 
        WHEN p.Payment_Date IS NOT NULL AND p.Payment_Date <= i.Duedate THEN 1
    END) as unit_tepat_waktu,
    
    -- Total unit yang ada tagihan pada bulan tersebut
    COUNT(*) as total_unit,
    
    -- Total tunggakan (invoice yang belum dibayar atau terlambat bayar)
    SUM(CASE 
        WHEN p.Payment_Date IS NULL OR p.Payment_Date > i.Duedate 
        THEN CAST(REPLACE(REPLACE(i.TOTAL::text, '.', ''), ',', '.') AS NUMERIC)
        ELSE 0
    END) as total_tunggakan,
    
    -- Persentase keterlambatan
    ROUND(
        (COUNT(CASE 
            WHEN p.Payment_Date IS NULL THEN 1
            WHEN p.Payment_Date > i.Duedate THEN 1
        END) * 100.0 / COUNT(*)), 2
    ) as persentase_terlambat

FROM invoice_air i
LEFT JOIN pembayaran_air p ON i.contract_id = p.Contract_Id
LEFT JOIN unit_pemilik up ON i."business_name" = up.Business_Name

GROUP BY bulan_jatuh_tempo
HAVING COUNT(*) > 0  -- Hanya tampilkan bulan yang ada data tagihan

ORDER BY bulan_jatuh_tempo;
-- Jenis: Line Chart
-- Sumbu X: bulan_jatuh_tempo
-- Sumbu Y: Persentase (%)
-- Data Series: persentase_terlambat
-- Group By: bulan_jatuh_tempo

-- =====================================================
-- Penggunaan air dari setiap lantai per tower data di Rusunami Jarrdin@Cihampelas
-- =====================================================
SELECT 
    m.tower || ' - Lantai ' || m.floor as tower_lantai,
    m.tower,
    m.floor as lantai,
    COUNT(DISTINCT t.contract_id) as jumlah_unit_aktif,
    ROUND(AVG(t.qty), 2) as rata_rata_penggunaan_air,
    SUM(t.qty) as total_penggunaan_air,
    ROUND(AVG(t.qty) * COUNT(DISTINCT t.contract_id), 2) as proyeksi_penggunaan_bulanan
    
FROM tagihan_air t
INNER JOIN master_unit m ON t."unit_code" = m.kode_unit
WHERE t.qty > 0  -- Hanya unit yang menggunakan air
GROUP BY m.tower, m.floor
ORDER BY m.tower, m.floor;
-- Jenis: Vertical Bar Chart
-- Sumbu X: tower_lantai (contoh: "TA - Lantai 1", "TA - Lantai 2", "TB - Lantai 1", dst.)
-- Sumbu Y: rata_rata_penggunaan_air (dalam m³)
-- Data: Hasil dari query utama
-- Group By: tower, lantai