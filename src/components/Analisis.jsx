import React, { useState, useEffect, useRef } from 'react';
import { useData } from '../context/DataContext';
import PDF from './PDF';
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const HalamanAnalisis = () => {
  const { fetchData, executeQuery } = useData();
  const pdfRef = useRef(null);
  
  // State untuk data
  const [visualisasiData, setVisualisasiData] = useState([]);
  const [parameterData, setParameterData] = useState([]);
  const [analisisData, setAnalisisData] = useState([]);
  
  // State untuk seleksi
  const [selectedVisualisasi, setSelectedVisualisasi] = useState([]);
  const [selectedAnalisis, setSelectedAnalisis] = useState(null);
  const [previewVisualisasi, setPreviewVisualisasi] = useState([]);
  
  // State untuk form
  const [judul, setJudul] = useState('');
  const [rumusanMasalah, setRumusanMasalah] = useState('');
  const [interpretasiHasil, setInterpretasiHasil] = useState('');
  const [formErrors, setFormErrors] = useState({});
  
  // State untuk chart data
  const [chartDataMap, setChartDataMap] = useState({});
  
  // State untuk pesan
  const [successMessage, setSuccessMessage] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  
  // Ambil data saat komponen dimuat
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const visualisasi = await fetchData('visualisasi');
        const parameter = await fetchData('parameter_visualisasi');
        
        const response = await fetch('http://localhost:5002/api/analisis');
        if (!response.ok) throw new Error('Gagal mengambil data analisis');
        const analisis = await response.json();
        
        // Urutkan visualisasi berdasarkan tanggal terbaru
        const sortedVisualisasi = [...visualisasi].sort((a, b) => {
          return new Date(b.created_at) - new Date(a.created_at);
        });
        
        setVisualisasiData(sortedVisualisasi);
        setParameterData(parameter);
        setAnalisisData(analisis);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    
    fetchAllData();
  }, [fetchData]);
  
  // Fungsi untuk memilih visualisasi
  const handleVisualisasiSelect = async (id) => {
    const isSelected = selectedVisualisasi.some(v => v.id_visualisasi === id);
    
    if (isSelected) {
      setSelectedVisualisasi(selectedVisualisasi.filter(v => v.id_visualisasi !== id));
      
      const newChartDataMap = { ...chartDataMap };
      delete newChartDataMap[id];
      setChartDataMap(newChartDataMap);
    } else {
      const selected = visualisasiData.find(v => v.id_visualisasi === id);
      
      if (selected) {
        try {
          let chartData;
          
          if (selected.chart_data) {
            chartData = JSON.parse(selected.chart_data);
          } else if (selected.query_sql) {
            chartData = await executeQuery(selected.query_sql);
          }
          
          setSelectedVisualisasi([...selectedVisualisasi, selected]);
          setChartDataMap(prev => ({
            ...prev,
            [id]: chartData
          }));
        } catch (err) {
          console.error('Error executing visualization query:', err);
        }
      }
    }
  };
  
  // Fungsi untuk memilih analisis dari katalog
  const handleAnalisisSelect = async (analisis) => {
    if (selectedAnalisis && selectedAnalisis.id_analisis === analisis.id_analisis) {
      setSelectedAnalisis(null);
      setPreviewVisualisasi([]);
      setChartDataMap({});
      return;
    }
    
    setSelectedAnalisis(analisis);
    
    try {
      const response = await fetch(`http://localhost:5002/api/analisis/${analisis.id_analisis}/visualisasi`);
      if (!response.ok) throw new Error('Gagal mengambil data visualisasi untuk analisis');
      
      const visualisasiIds = await response.json();
      const relatedVisualizations = visualisasiData.filter(v => visualisasiIds.includes(v.id_visualisasi));
      
      if (relatedVisualizations.length > 0) {
        const newChartDataMap = { ...chartDataMap };
        
        for (const vis of relatedVisualizations) {
          let chartData;
          
          if (vis.chart_data) {
            chartData = JSON.parse(vis.chart_data);
          } else if (vis.query_sql) {
            chartData = await executeQuery(vis.query_sql);
          }
          
          newChartDataMap[vis.id_visualisasi] = chartData;
        }
        
        setChartDataMap(newChartDataMap);
        setPreviewVisualisasi(relatedVisualizations);
      } else {
        setPreviewVisualisasi([]);
      }
    } catch (err) {
      console.error('Error loading visualizations for analysis:', err);
    }
  };
  
  // Fungsi untuk render grafik berdasarkan jenis
  const renderChart = (visualisasi, chartData) => {
    if (!chartData || chartData.length === 0) {
      return <div className="no-chart-data">Tidak ada data untuk visualisasi ini</div>;
    }
    
    const parameter = parameterData.find(p => p.id_visualisasi === visualisasi.id_visualisasi);
    
    if (!parameter) {
      return <div className="no-chart-data">Parameter visualisasi tidak ditemukan</div>;
    }
    
    const dataKey = parameter.parameter_x;
    const valueKey = parameter.parameter_y;
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        {visualisasi.jenis_grafik === 'bar' ? (
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dataKey} />
            <YAxis />
            <Tooltip />
            <Legend 
              payload={[
                { value: `Sumbu X: ${dataKey}`, type: 'line', color: '#666' },
                { value: `Sumbu Y: ${valueKey}`, type: 'rect', color: '#8884d8' }
              ]}
            />
            <Bar dataKey={valueKey} fill="#8884d8" name={valueKey} />
          </BarChart>
        ) : visualisasi.jenis_grafik === 'line' ? (
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={dataKey} />
            <YAxis />
            <Tooltip />
            <Legend 
              payload={[
                { value: `Sumbu X: ${dataKey}`, type: 'line', color: '#666' },
                { value: `Sumbu Y: ${valueKey}`, type: 'line', color: '#8884d8' }
              ]}
            />
            <Line type="monotone" dataKey={valueKey} stroke="#8884d8" name={valueKey} />
          </LineChart>
        ) : visualisasi.jenis_grafik === 'pie' ? (
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={true}
              outerRadius={150}
              fill="#8884d8"
              dataKey={valueKey}
              nameKey={dataKey}
              label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend 
              payload={[
                { value: `Category: ${dataKey}`, type: 'rect', color: '#666' },
                { value: `Values: ${valueKey}`, type: 'rect', color: '#8884d8' }
              ]}
            />
          </PieChart>
        ) : (
          <ScatterChart>
            <CartesianGrid />
            <XAxis type="number" dataKey={dataKey} name={dataKey} />
            <YAxis type="number" dataKey={valueKey} name={valueKey} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend 
              payload={[
                { value: `Sumbu X: ${dataKey}`, type: 'rect', color: '#666' },
                { value: `Sumbu Y: ${valueKey}`, type: 'rect', color: '#8884d8' }
              ]}
            />
            <Scatter name={`${dataKey} vs ${valueKey}`} data={chartData} fill="#8884d8" />
          </ScatterChart>
        )}
      </ResponsiveContainer>
    );
  };
  
  // Validasi form
  const validateForm = () => {
    const errors = {};
    
    if (!judul.trim()) errors.judul = 'Judul analisis wajib diisi!';
    if (!rumusanMasalah.trim()) errors.rumusanMasalah = 'Rumusan masalah wajib diisi!';
    if (!interpretasiHasil.trim()) errors.interpretasiHasil = 'Interpretasi hasil wajib diisi!';
    if (selectedVisualisasi.length === 0) errors.visualisasi = 'Minimal satu visualisasi wajib dipilih!';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Fungsi untuk menyimpan analisis
  const saveAnalisis = async () => {
    setSaveSuccess(false);
    setSaveError(false);
    
    if (!validateForm()) return;
    
    const visualisasi_ids = selectedVisualisasi.map(vis => vis.id_visualisasi);
    
    try {
      const saveResponse = await fetch('http://localhost:5002/api/analisis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          judul,
          masalah: rumusanMasalah,
          interpretasi_hasil: interpretasiHasil,
          visualisasi_ids
        }),
      });
      
      if (!saveResponse.ok) throw new Error('Gagal menyimpan analisis');
      
      // Reset form
      setJudul('');
      setRumusanMasalah('');
      setInterpretasiHasil('');
      setSelectedVisualisasi([]);
      setChartDataMap({});
      setSelectedAnalisis(null);
      setSaveSuccess(true);
      setSuccessMessage("Analisis berhasil disimpan!");
      
      // Refresh data analisis
      try {
        const refreshResponse = await fetch('http://localhost:5002/api/analisis');
        if (refreshResponse.ok) {
          const analisis = await refreshResponse.json();
          setAnalisisData(analisis);
        }
      } catch (refreshErr) {
        console.error('Error refreshing data:', refreshErr);
      }
      
      setTimeout(() => {
        setSaveSuccess(false);
        setSuccessMessage("");
      }, 3000);
    } catch (err) {
      console.error('Error saving analisis:', err);
      setSaveError(true);
      setTimeout(() => setSaveError(false), 3000);
    }
  };
  
  // Fungsi untuk download PDF
  const downloadPDF = async () => {
    const success = await PDF.downloadAnalisisPDF(selectedAnalisis, previewVisualisasi);
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    }
  };  
  
  // Format tanggal untuk tampilan
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    return new Date(dateString).toLocaleDateString('id-ID', options);
  };

  // Fungsi untuk menghapus analisis
  const handleDeleteAnalisis = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus analisis ini?')) {
      try {
        const response = await fetch(`http://localhost:5002/api/analisis/${id}`, {
          method: 'DELETE',
        });
        
        if (!response.ok) throw new Error('Gagal menghapus analisis');
        
        if (selectedAnalisis && selectedAnalisis.id_analisis === id) {
          setSelectedAnalisis(null);
          setPreviewVisualisasi([]);
          setChartDataMap({});
        }
        
        const getResponse = await fetch('http://localhost:5002/api/analisis');
        if (getResponse.ok) {
          const analisis = await getResponse.json();
          setAnalisisData(analisis);
        }
        
        setSaveSuccess(true);
        setSuccessMessage("Analisis berhasil dihapus!");
        setTimeout(() => {
          setSaveSuccess(false);
          setSuccessMessage("");
        }, 3000);
      } catch (err) {
        console.error('Error deleting analisis:', err);
        setSaveError(true);
        setTimeout(() => setSaveError(false), 3000);
      }
    }
  };

  // Fungsi untuk menghapus visualisasi
  const handleDeleteVisualisasi = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus visualisasi ini?')) {
      try {
        const response = await fetch(`http://localhost:5002/api/visualizations/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        // Baca response body untuk mendapatkan detail error
        const responseData = await response.text();
        
        if (!response.ok) {
          let errorMessage = 'Gagal menghapus visualisasi';
          
          try {
            const errorData = JSON.parse(responseData);
            errorMessage = errorData.error || errorData.message || errorMessage;
            
            // Tampilkan pesan khusus jika visualisasi digunakan dalam analisis
            if (response.status === 403 && errorData.usage_count) {
              errorMessage = `Visualisasi tidak dapat dihapus karena sedang digunakan dalam salah satu analisis`;
            }
          } catch (e) {
            errorMessage = responseData || errorMessage;
          }
          
          throw new Error(errorMessage);
        }
        
        // Perbarui data visualisasi di state
        const updatedVisualisasi = visualisasiData.filter(item => item.id_visualisasi !== id);
        setVisualisasiData(updatedVisualisasi);
        
        // Hapus dari visualisasi yang dipilih jika ada
        if (selectedVisualisasi.some(v => v.id_visualisasi === id)) {
          const newSelectedVisualisasi = selectedVisualisasi.filter(v => v.id_visualisasi !== id);
          setSelectedVisualisasi(newSelectedVisualisasi);
          
          const newChartDataMap = { ...chartDataMap };
          delete newChartDataMap[id];
          setChartDataMap(newChartDataMap);
        }
        
        // Hapus dari preview jika sedang aktif
        if (previewVisualisasi.some(v => v.id_visualisasi === id)) {
          const newPreviewVisualisasi = previewVisualisasi.filter(v => v.id_visualisasi !== id);
          setPreviewVisualisasi(newPreviewVisualisasi);
        }
        
        setSaveSuccess(true);
        setSuccessMessage("Visualisasi berhasil dihapus!");
        setTimeout(() => {
          setSaveSuccess(false);
          setSuccessMessage("");
        }, 3000);
        
      } catch (err) {
        console.error('Error deleting visualisasi:', err);
        
        // Tampilkan error yang spesifik ke user
        alert(`${err.message}`);
        
        setSaveError(true);
        setTimeout(() => setSaveError(false), 3000);
      }
    }
  };
  
  return (
    <div className="analisis-container" ref={pdfRef}>
      <h1>Membuat Analisis</h1>
      {/* Katalog Visualisasi */}
      <div className="catalog-section">
        <h2>Katalog Visualisasi</h2>
        {saveSuccess && successMessage.includes("Visualisasi") && (
          <div className="save-success-message">
            {successMessage}
          </div>
        )}
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Pilih</th>
                <th>Judul</th>
                <th className="description-column">Deskripsi</th>
                <th>Jenis Grafik</th>
                <th>Tanggal Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {visualisasiData.map((item) => (
                <tr key={item.id_visualisasi}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedVisualisasi.some(v => v.id_visualisasi === item.id_visualisasi)}
                      onChange={() => handleVisualisasiSelect(item.id_visualisasi)}
                    />
                  </td>
                  <td>{item.judul}</td>
                  <td>{item.deskripsi}</td>
                  <td>{item.jenis_grafik}</td>
                  <td>{formatDate(item.created_at)}</td>
                  <td>
                    <button 
                      className="delete-button"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Tambahkan fungsi untuk menghapus visualisasi
                        handleDeleteVisualisasi(item.id_visualisasi);
                      }}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {formErrors.visualisasi && <div className="input-error-message">{formErrors.visualisasi}</div>}
      </div>
      
      {/* Preview Visualisasi */}
      {selectedVisualisasi.length > 0 && (
        <div className="visualization-preview">
          <h2>Preview Visualisasi</h2>
          {selectedVisualisasi.map(vis => (
            <div key={vis.id_visualisasi} className="chart-item" id={`chart-${vis.id_visualisasi}`}>
              <h4>{vis.judul}</h4>
              <div className="chart-container">
                {renderChart(vis, chartDataMap[vis.id_visualisasi])}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Form Analisis */}
      <div className="form-section">
        <div className="form-group">
          <label htmlFor="judul">Judul Analisis: <span className="required">*</span></label>
          <input
            type="text"
            id="judul"
            className="form-input"
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            placeholder="Masukkan judul analisis"
          />
          {formErrors.judul && <div className="input-error-message">{formErrors.judul}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="rumusan">Rumusan Masalah: <span className="required">*</span></label>
          <textarea
            id="rumusan"
            className="form-textarea"
            value={rumusanMasalah}
            onChange={(e) => setRumusanMasalah(e.target.value)}
            placeholder="Masukkan rumusan masalah"
            rows={4}
          />
          {formErrors.rumusanMasalah && <div className="input-error-message">{formErrors.rumusanMasalah}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="interpretasi">Interpretasi Hasil: <span className="required">*</span></label>
          <textarea
            id="interpretasi"
            className="form-textarea"
            value={interpretasiHasil}
            onChange={(e) => setInterpretasiHasil(e.target.value)}
            placeholder="Masukkan interpretasi hasil"
            rows={6}
          />
          {formErrors.interpretasiHasil && <div className="input-error-message">{formErrors.interpretasiHasil}</div>}
        </div>
        
        <div className="button-group">
          <button className="save-button" onClick={saveAnalisis}>Simpan Analisis</button>
        </div>
        
        {saveSuccess && successMessage === "Analisis berhasil disimpan!" && (
          <div className="save-success-message">{successMessage}</div>
        )}
        
        {saveError && (
          <div className="input-error-message">Analisis gagal disimpan!</div>
        )}
      </div>
      
      <div className="section-divider"></div>
      
      {/* Katalog Analisis */}
      <div className="catalog-section">
        <h2>Katalog Analisis</h2>
        
        {saveSuccess && successMessage === "Analisis berhasil dihapus!" && (
          <div className="save-success-message">{successMessage}</div>
        )}
        
        <div className="data-table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Judul</th>
                <th>Visualisasi</th>
                <th>Tanggal Dibuat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {analisisData.length > 0 ? (
                analisisData.map((item) => (
                  <tr 
                    key={item.id_analisis} 
                    className={selectedAnalisis && selectedAnalisis.id_analisis === item.id_analisis ? 'selected-row' : ''}
                  >
                    <td>{item.judul}</td>
                    <td>
                      {item.visualisasi_judul}
                      {item.jumlah_visualisasi > 1 && (
                        <span className="visualisasi-count"> ({item.jumlah_visualisasi})</span>
                      )}
                    </td>
                    <td>{formatDate(item.created_at)}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className={selectedAnalisis && selectedAnalisis.id_analisis === item.id_analisis ? 'cancel-button' : 'view-button'}
                          onClick={() => handleAnalisisSelect(item)}
                        >
                          {selectedAnalisis && selectedAnalisis.id_analisis === item.id_analisis ? 'Batal' : 'Lihat'}
                        </button>
                        <button 
                          className="delete-button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteAnalisis(item.id_analisis);
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="no-data">Belum ada analisis tersimpan</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Preview Analisis */}
      {selectedAnalisis && (
        <div className="analisis-preview" id="analisis-preview">
          <h2>Preview Analisis</h2>
          <div className="analisis-content">
            <h3>{selectedAnalisis.judul}</h3>
            
            <div className="analisis-section">
              <h4>Rumusan Masalah:</h4>
              <p>{selectedAnalisis.masalah}</p>
            </div>
            
            <div className="analisis-section">
              <h4>Visualisasi:</h4>
              {previewVisualisasi.map(vis => (
                <div key={vis.id_visualisasi} className="chart-item" id={`chart-${vis.id_visualisasi}`}>
                  <h4>{vis.judul}</h4>
                  <div className="chart-container">
                    {renderChart(vis, chartDataMap[vis.id_visualisasi])}
                  </div>
                </div>
              ))}
            </div>
            
            <div className="analisis-section">
              <h4>Interpretasi Hasil:</h4>
              <p>{selectedAnalisis.interpretasi_hasil}</p>
            </div>
            
            <div className="button-group">
              <button className="download-button" onClick={downloadPDF}>Download PDF</button>
            </div>
            
            {downloadSuccess && (
              <div className="save-success-message">PDF berhasil diunduh!</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default HalamanAnalisis;