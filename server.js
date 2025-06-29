const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Konfigurasi koneksi PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER || 'rayhanadjisantoso',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'TA',
  password: process.env.DB_PASSWORD || 'rayhan123',
  port: process.env.DB_PORT || 5432,
});

// Verifikasi koneksi database
pool.query('SELECT current_database()', (err, res) => {
  if (err) {
    console.error('Error checking database:', err);
  } else {
    console.log('Connected to database:', res.rows[0].current_database);
  }
});

// Fungsi helper untuk menangani error
const handleQueryError = (error, operation, res) => {
  console.error(`Error ${operation}:`, error);
  res.status(500).json({ error: error.message });
};

// Endpoint untuk mendapatkan semua tabel
app.get('/api/tables', async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    res.json(result.rows.map(row => row.table_name));
  } catch (error) {
    handleQueryError(error, 'fetching tables', res);
  }
});

// Endpoint untuk mendapatkan data dari tabel tertentu
app.get('/api/data/:table', async (req, res) => {
  const { table } = req.params;
  try {
    const result = await pool.query(`SELECT * FROM ${table} LIMIT 1000`);
    res.json(result.rows);
  } catch (error) {
    handleQueryError(error, `fetching data from ${table}`, res);
  }
});

// Endpoint untuk menjalankan query SQL kustom
app.post('/api/query', async (req, res) => {
  const { query } = req.body;
  try {
    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    handleQueryError(error, 'executing query', res);
  }
});

// Endpoint untuk menyimpan visualisasi
app.post('/api/visualizations', async (req, res) => {
  const { visualization, parameter } = req.body;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const visualizationResult = await client.query(
      `INSERT INTO visualisasi (judul, deskripsi, jenis_grafik, query_sql, berparameter, chart_data, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING id_visualisasi`,
      [visualization.judul, visualization.deskripsi, visualization.jenis_grafik, 
       visualization.query_sql, visualization.berparameter, visualization.chart_data]
    );
    
    const visualizationId = visualizationResult.rows[0].id_visualisasi;
    
    await client.query(
      `INSERT INTO parameter_visualisasi (id_visualisasi, parameter_x, parameter_y, group_by, created_at) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [visualizationId, parameter.parameter_x, parameter.parameter_y, parameter.group_by || null]
    );
    
    await client.query('COMMIT');
    res.status(201).json({ success: true, message: 'Visualisasi berhasil disimpan' });
  } catch (error) {
    await client.query('ROLLBACK');
    handleQueryError(error, 'saving visualization', res);
  } finally {
    client.release();
  }
});

// Endpoint untuk menghapus visualisasi berdasarkan ID
app.delete('/api/visualizations/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
        // Periksa apakah visualisasi ada
        const checkResult = await client.query(
            'SELECT id_visualisasi FROM visualisasi WHERE id_visualisasi = $1',
            [id]
        );
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Visualisasi tidak ditemukan' });
        }

        // Periksa apakah visualisasi digunakan dalam analisis
        const usageCheck = await client.query(
            'SELECT COUNT(*) as count FROM analisis_visualisasi WHERE id_visualisasi = $1',
            [id]
        );
        
        if (usageCheck.rows[0].count > 0) {
            return res.status(403).json({ 
                error: 'Visualisasi tidak dapat dihapus karena sedang digunakan dalam katalog analisis',
                usage_count: usageCheck.rows[0].count
            });
        }

        await client.query('BEGIN');

        // Hapus parameter visualisasi
        await client.query(
            'DELETE FROM parameter_visualisasi WHERE id_visualisasi = $1',
            [id]
        );

        // Hapus visualisasi
        const deleteResult = await client.query(
            'DELETE FROM visualisasi WHERE id_visualisasi = $1',
            [id]
        );

        if (deleteResult.rowCount === 0) {
            throw new Error('Tidak ada data yang dihapus');
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Visualisasi berhasil dihapus' });
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Delete error:', error);
        res.status(500).json({ 
            error: 'Gagal menghapus visualisasi', 
            details: error.message 
        });
    } finally {
        client.release();
    }
});

// Endpoint untuk menyimpan analisis
app.post('/api/analisis', async (req, res) => {
  const { judul, masalah, interpretasi_hasil, visualisasi_ids } = req.body;
  
  // Validasi input
  if (!judul || !visualisasi_ids || !visualisasi_ids.length) {
    return res.status(400).json({ error: 'Judul dan visualisasi wajib diisi' });
  }
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const analisisResult = await client.query(
      `INSERT INTO analisis (judul, masalah, interpretasi_hasil, created_at) 
       VALUES ($1, $2, $3, NOW()) RETURNING id_analisis`,
      [judul, masalah || null, interpretasi_hasil || null]
    );
    
    const analisisId = analisisResult.rows[0].id_analisis;
    
    // Simpan relasi analisis-visualisasi
    for (const visId of visualisasi_ids) {
      await client.query(
        `INSERT INTO analisis_visualisasi (id_analisis, id_visualisasi, created_at) 
         VALUES ($1, $2, NOW())`,
        [analisisId, visId]
      );
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({ 
      success: true, 
      message: 'Analisis berhasil disimpan',
      id_analisis: analisisId 
    });
  } catch (error) {
    await client.query('ROLLBACK');
    handleQueryError(error, 'saving analisis', res);
  } finally {
    client.release();
  }
});

// Endpoint untuk mendapatkan semua analisis
app.get('/api/analisis', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, 
              STRING_AGG(v.judul, ', ') as visualisasi_judul,
              COUNT(av.id_visualisasi) as jumlah_visualisasi
       FROM analisis a 
       LEFT JOIN analisis_visualisasi av ON a.id_analisis = av.id_analisis
       LEFT JOIN visualisasi v ON av.id_visualisasi = v.id_visualisasi 
       GROUP BY a.id_analisis
       ORDER BY a.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    handleQueryError(error, 'fetching analisis', res);
  }
});

// Endpoint untuk mendapatkan detail analisis beserta visualisasinya
app.get('/api/analisis/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const analisisResult = await pool.query(
      `SELECT * FROM analisis WHERE id_analisis = $1`,
      [id]
    );
    
    if (analisisResult.rows.length === 0) {
      return res.status(404).json({ error: 'Analisis tidak ditemukan' });
    }
    
    const analisis = analisisResult.rows[0];
    
    const visualisasiResult = await pool.query(
      `SELECT v.*, p.parameter_x, p.parameter_y, p.group_by 
       FROM visualisasi v 
       JOIN analisis_visualisasi av ON v.id_visualisasi = av.id_visualisasi
       LEFT JOIN parameter_visualisasi p ON v.id_visualisasi = p.id_visualisasi 
       WHERE av.id_analisis = $1`,
      [id]
    );
    
    analisis.visualisasi = visualisasiResult.rows;
    
    res.json(analisis);
  } catch (error) {
    handleQueryError(error, `fetching analisis with id ${id}`, res);
  }
});

// Endpoint untuk menghapus analisis berdasarkan ID
app.delete('/api/analisis/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    const checkResult = await pool.query(
      'SELECT id_analisis FROM analisis WHERE id_analisis = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Analisis tidak ditemukan' });
    }
    
    await pool.query(
      'DELETE FROM analisis WHERE id_analisis = $1',
      [id]
    );
    
    res.json({ success: true, message: 'Analisis berhasil dihapus' });
  } catch (error) {
    handleQueryError(error, `deleting analisis with id ${id}`, res);
  }
});

// Endpoint untuk mendapatkan semua visualisasi
app.get('/api/visualizations', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*, p.parameter_x, p.parameter_y, p.group_by 
       FROM visualisasi v 
       LEFT JOIN parameter_visualisasi p ON v.id_visualisasi = p.id_visualisasi 
       ORDER BY v.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    handleQueryError(error, 'fetching visualizations', res);
  }
});

// Endpoint untuk mendapatkan visualisasi berdasarkan ID
app.get('/api/visualizations/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      `SELECT v.*, p.parameter_x, p.parameter_y, p.group_by, p.id_parameter 
       FROM visualisasi v 
       LEFT JOIN parameter_visualisasi p ON v.id_visualisasi = p.id_visualisasi 
       WHERE v.id_visualisasi = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Visualisasi tidak ditemukan' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    handleQueryError(error, `fetching visualization with id ${id}`, res);
  }
});

// Endpoint untuk mendapatkan ID visualisasi yang terkait dengan analisis tertentu
app.get('/api/analisis/:id/visualisasi', async (req, res) => {
  const { id } = req.params;
  try {
    const checkResult = await pool.query(
      'SELECT id_analisis FROM analisis WHERE id_analisis = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Analisis tidak ditemukan' });
    }
    
    const result = await pool.query(
      `SELECT id_visualisasi 
       FROM analisis_visualisasi 
       WHERE id_analisis = $1`,
      [id]
    );
    
    const visualisasiIds = result.rows.map(row => row.id_visualisasi);
    res.json(visualisasiIds);
  } catch (error) {
    handleQueryError(error, `fetching visualisasi for analisis with id ${id}`, res);
  }
});

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});