import React, { useState, useEffect } from 'react';
import { useData } from '../context/DataContext';
import Analisis from './Analisis';
import Sidebar from './Sidebar';
import { 
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const HalamanVisualisasi = ({ activeTabProp }) => {
  const [activeTab, setActiveTab] = useState(activeTabProp || 'data');
  const { 
    isLoading, 
    error,
    availableTables, 
    fetchData, 
    executeQuery 
  } = useData();
  
  // Perbarui activeTab ketika activeTabProp berubah
  useEffect(() => {
    if (activeTabProp) {
      setActiveTab(activeTabProp);
    }
  }, [activeTabProp]);
  
  // State untuk fitur katalog data
  const [availableData, setAvailableData] = useState([]);
  const [selectedData, setSelectedData] = useState({});
  
  // State untuk query SQL
  const [sqlQuery, setSqlQuery] = useState('');
  const [queryResult, setQueryResult] = useState([]);
  const [queryError, setQueryError] = useState(null);
  const [querySuccess, setQuerySuccess] = useState(false); // State baru untuk pesan sukses query
  
  // State untuk pemilihan parameter dan jenis grafik
  const [selectedParameters, setSelectedParameters] = useState({
    xAxis: '',
    yAxis: '',
    groupBy: ''
  });
  const [chartType, setChartType] = useState('bar');
  const [chartData, setChartData] = useState([]);
  const [availableColumns, setAvailableColumns] = useState([]);
  
  // State untuk judul, deskripsi, dan status penyimpanan visualisasi
  const [chartTitle, setChartTitle] = useState('');
  const [chartDescription, setChartDescription] = useState('');
  const [titleError, setTitleError] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [visualizationError, setVisualizationError] = useState(false); // State baru untuk error visualisasi
  
  // Mengambil daftar tabel saat komponen dimuat
  useEffect(() => {
    if (availableTables.length > 0) {
      // Filter tabel visualisasi dan parameter_visualisasi
      const filteredTables = availableTables.filter(
        table => table !== 'visualisasi' && table !== 'parameter_visualisasi' && table!== 'analisis' && table!== 'analisis_visualisasi'
      );
      
      const tableData = filteredTables.map(table => ({
        name: table,
        checked: false
      }));
      setAvailableData(tableData);
    }
  }, [availableTables]);
  
  // Fungsi untuk menangani perubahan checkbox
  const handleCheckboxChange = async (index) => {
    const updatedData = [...availableData];
    updatedData[index].checked = !updatedData[index].checked;
    setAvailableData(updatedData);
    
    // Jika checkbox dicentang, ambil data dari API
    if (updatedData[index].checked) {
      try {
        const tableName = updatedData[index].name;
        const data = await fetchData(tableName);
        setSelectedData(prev => ({
          ...prev,
          [tableName]: data
        }));
      } catch (error) {
        console.error(`Error fetching data:`, error);
      }
    } else {
      // Jika checkbox tidak dicentang, hapus data
      const newSelectedData = { ...selectedData };
      delete newSelectedData[updatedData[index].name];
      setSelectedData(newSelectedData);
    }
  };
  
  // Fungsi untuk menjalankan query SQL
  const runQuery = async () => {
    if (!sqlQuery.trim()) {
      setQueryError('Query wajib diisi!');
      return;
    }
    
    try {
      setQueryError(null);
      const result = await executeQuery(sqlQuery);
      setQueryResult(result);
      
      // Update available columns for chart if query result is not empty
      if (result.length > 0) {
        setAvailableColumns(Object.keys(result[0]));
      }
      
      // Reset chart title and description when new query is executed
      setChartTitle('');
      setChartDescription('');
      setTitleError(false);
      setSaveSuccess(false);
      
      // Reset chart parameters and data
      setSelectedParameters({
        xAxis: '',
        yAxis: '',
        groupBy: ''
      });
      setChartData([]);
      setChartType('bar');
      
      // Menampilkan pesan sukses setelah query berhasil dijalankan
      setQuerySuccess(true);
      setTimeout(() => {
        setQuerySuccess(false);
      }, 3000);
  
    } catch (error) {
      console.error('Error executing SQL query:', error);
      setQueryError(error.message);
      setQueryResult([]);
    }
  };
  
  // Fungsi untuk mendapatkan kolom dari hasil query
  const getColumns = (data) => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]);
  };
  
  // Fungsi untuk mengupdate parameter grafik
  const handleParameterChange = (paramName, value) => {
    setSelectedParameters(prev => ({
      ...prev,
      [paramName]: value
    }));
  };
  
  // Fungsi untuk menghasilkan data grafik berdasarkan parameter yang dipilih
  useEffect(() => {
    if (queryResult.length > 0 && selectedParameters.xAxis && selectedParameters.yAxis) {
      let data = [...queryResult];
      
      // Jika ada groupBy, lakukan agregasi
      if (selectedParameters.groupBy) {
        const grouped = {};
        data.forEach(item => {
          const key = item[selectedParameters.groupBy];
          if (!grouped[key]) {
            grouped[key] = {
              [selectedParameters.xAxis]: item[selectedParameters.xAxis],
              [selectedParameters.groupBy]: key,
              [selectedParameters.yAxis]: 0,
              count: 0
            };
          }
          grouped[key][selectedParameters.yAxis] += parseFloat(item[selectedParameters.yAxis]) || 0;
          grouped[key].count += 1;
        });
        
        // Konversi kembali ke array
        data = Object.values(grouped).map(item => ({
          ...item,
          [selectedParameters.yAxis]: item[selectedParameters.yAxis] / item.count
        }));
      }
      
      // Pastikan nilai numerik untuk sumbu Y
      data = data.map(item => ({
        ...item,
        [selectedParameters.yAxis]: parseFloat(item[selectedParameters.yAxis]) || 0
      }));
      
      setChartData(data);
    }
  }, [queryResult, selectedParameters]);
  
  // Fungsi untuk menyimpan visualisasi
  const saveVisualization = async () => {
    // Reset pesan status
    setSaveSuccess(false);
    setSaveError(false);
    setVisualizationError(false);
    
    // Validasi judul dan visualisasi (keduanya wajib diisi)
    let hasError = false;
    
    if (!chartTitle.trim()) {
      setTitleError(true);
      hasError = true;
    } else {
      setTitleError(false);
    }
    
    if (chartData.length === 0 || !selectedParameters.xAxis || !selectedParameters.yAxis) {
      setVisualizationError(true);
      hasError = true;
    }
    
    if (hasError) {
      return;
    }
    
    setTitleError(false);
    
    // Buat objek visualisasi
    const visualization = {
      judul: chartTitle,
      deskripsi: chartDescription,
      jenis_grafik: chartType,
      query_sql: sqlQuery,
      berparameter: !!selectedParameters.xAxis || !!selectedParameters.yAxis || !!selectedParameters.groupBy,
      chart_data: JSON.stringify(chartData) // Simpan data chart yang sebenarnya
    };
    
    // Buat objek parameter jika ada
    const parameter = {
      parameter_x: selectedParameters.xAxis,
      parameter_y: selectedParameters.yAxis,
      group_by: selectedParameters.groupBy || null
    };
    
    try {
      // Kirim data ke server
      const response = await fetch('http://localhost:5002/api/visualizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ visualization, parameter })
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setSaveSuccess(true);

        // Timeout 3 detik untuk menghilangkan pesan sukses
        setTimeout(() => {
          setSaveSuccess(false);
        }, 3000);
        
        // Tampilkan pop-up konfirmasi
        if (window.confirm('Visualisasi berhasil disimpan! Apakah anda ingin menggunakan hasil query yang sama?')) {
          // Jika iya, pertahankan query dan hasil query, reset parameter saja
          setSelectedParameters({
            xAxis: '',
            yAxis: '',
            groupBy: ''
          });
          setChartData([]);
          setChartTitle('');
          setChartDescription('');
        } else {
          // Jika tidak, reset semua
          setSqlQuery('');
          setQueryResult([]);
          setChartData([]);
          setChartTitle('');
          setChartDescription('');
          setSelectedParameters({
            xAxis: '',
            yAxis: '',
            groupBy: ''
          });
          setAvailableColumns([]);
          setChartType('bar');
        }
      } else {
        setSaveError(true);
        console.error('Error saving visualization:', result.error);
      }
    } catch (error) {
      setSaveError(true);
      console.error('Error saving visualization:', error);
    }
  };

  // Render grafik berdasarkan jenis yang dipilih
  const renderChart = () => {
    if (chartData.length === 0 || !selectedParameters.xAxis || !selectedParameters.yAxis) {
      return (
        <>
          <div className="no-chart-data">Pilih parameter dan jalankan query untuk menampilkan grafik</div>
          {visualizationError && !chartTitle.trim() && (
            <div className="input-error-message">
              Diwajibkan untuk membuat visualisasi!
            </div>
          )}
        </>
      );
    }
    
    const dataKey = selectedParameters.xAxis;
    const valueKey = selectedParameters.yAxis;
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1'];
    
    return (
      <ResponsiveContainer width="100%" height={400}>
        {chartType === 'bar' ? (
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
        ) : chartType === 'line' ? (
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
        ) : chartType === 'pie' ? (
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

  return (
    <div className="dashboard-container">
      <Sidebar activeTabProp={activeTab}>
        {isLoading ? (
          <div className="loading">
            <div className="loading-spinner"></div>
            <p>Memuat data...</p>
          </div>
        ) : error ? (
          <div className="error">
            <i className="fas fa-exclamation-triangle"></i> Error: {error}
          </div>
        ) : (
          <div className="dashboard-content">
            {activeTab === 'data' && (
              <div className="data-explorer">
                <h1>Membuat Visualisasi</h1>
                {/* Katalog Data */}
                <div className="catalog-section">
                  <h2>Katalog Data</h2>
                  <div className="data-table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Pilih</th>
                          <th>Nama File</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableData.map((data, index) => (
                          <tr key={index}>
                            <td>
                              <input 
                                type="checkbox" 
                                checked={data.checked} 
                                onChange={() => handleCheckboxChange(index)}
                              />
                            </td>
                            <td>{data.name}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Preview Data */}
                {Object.keys(selectedData).length > 0 && (
                  <div className="preview-section">
                    <h2>Preview Data</h2>
                    {Object.entries(selectedData).map(([name, data]) => {
                      const columns = data.length > 0 ? Object.keys(data[0]) : [];
                      return (
                        <div key={name} className="preview-table-container">
                          <h4>{name}</h4>
                          <div className="table-scroll">
                            <table className="preview-table">
                              <thead>
                                <tr>
                                  {columns.map((col, i) => (
                                    <th key={i}>{col}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {data.slice(0, 10).map((row, i) => (
                                  <tr key={i}>
                                    {columns.map((col, j) => (
                                      <td key={j}>{row[col]}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Masukan Query SQL */}
                <div className="query-section">
                  <h2>Query SQL</h2>
                  <div className="query-input-container">
                    <textarea 
                      className="sql-input"
                      value={sqlQuery}
                      onChange={(e) => setSqlQuery(e.target.value)}
                      placeholder="Masukkan query SQL"
                      rows={4}
                    />
                    <button 
                      className="execute-button"
                      onClick={runQuery}
                    >
                      Jalankan Query
                    </button>
                  </div>
                  {queryError && (
                    <div className="input-error-message">
                      {queryError}
                    </div>
                  )}
                  {querySuccess && (
                    <div className="save-success-message">
                      Query berhasil dijalankan!
                    </div>
                  )}
                </div>
                
                {/* Hasil Query */}
                <div className="query-result-section">
                  <h2>Hasil Query</h2>
                  {queryError && (
                    <div className="input-error-message">
                      {queryError}
                    </div>
                  )}
                  {queryResult.length > 0 && (
                    <div className="data-table-container" style={{ maxHeight: '400px', overflowY: 'auto', border: '1px solid #ddd', borderRadius: '4px' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            {getColumns(queryResult).map((col, i) => (
                              <th key={i}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {queryResult.map((row, i) => (
                            <tr key={i}>
                              {getColumns(queryResult).map((col, j) => (
                                <td key={j}>
                                  {typeof row[col] === 'string' && row[col].includes('T17:00:00.000Z') 
                                    ? row[col].split('T')[0] 
                                    : row[col]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                
                {/* Chart Parameter Selection */}
                <div className="chart-params-section">
                  <h2>Visualisasi Data</h2>
                  <div className="chart-params-container">
                    <div className="chart-param-group">
                      <label>Jenis Grafik:</label>
                      <select 
                        value={chartType} 
                        onChange={(e) => setChartType(e.target.value)}
                        className="chart-param-select"
                      >
                        <option value="bar">Bar Chart</option>
                        <option value="line">Line Chart</option>
                        <option value="scatter">Scatter Plot</option>
                        <option value="pie">Pie Chart</option>
                      </select>
                    </div>
                    
                    <div className="chart-param-group">
                      <label>Parameter X:</label>
                      <select 
                        value={selectedParameters.xAxis} 
                        onChange={(e) => handleParameterChange('xAxis', e.target.value)}
                        className="chart-param-select"
                      >
                        <option value="">Pilih Parameter</option>
                        {availableColumns.map((col, i) => (
                          <option key={i} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="chart-param-group">
                      <label>Parameter Y:</label>
                      <select 
                        value={selectedParameters.yAxis} 
                        onChange={(e) => handleParameterChange('yAxis', e.target.value)}
                        className="chart-param-select"
                      >
                        <option value="">Pilih Parameter</option>
                        {availableColumns.map((col, i) => (
                          <option key={i} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="chart-param-group">
                      <label>Group By (Opsional):</label>
                      <select 
                        value={selectedParameters.groupBy} 
                        onChange={(e) => handleParameterChange('groupBy', e.target.value)}
                        className="chart-param-select"
                      >
                        <option value="">Tidak Ada</option>
                        {availableColumns.map((col, i) => (
                          <option key={i} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Chart Visualization */}
                  <div className="chart-container">
                    {renderChart()}
                  </div>
                </div>

                {/* Chart Title, Description, and Save Button */}
                <div className="chart-save-section">
                  <div className="chart-input-group">
                    <label htmlFor="chart-title">Judul Visualisasi: <span className="required">*</span></label>
                    <input 
                      id="chart-title"
                      type="text" 
                      value={chartTitle} 
                      onChange={(e) => setChartTitle(e.target.value)}
                      className={`chart-input ${titleError ? 'input-error' : ''}`}
                      placeholder="Masukkan judul visualisasi"
                    />
                    {titleError && <div className="input-error-message">Judul visualisasi wajib diisi!</div>}
                  </div>
                  
                  <div className="chart-input-group">
                    <label htmlFor="chart-description">Deskripsi (Opsional):</label>
                    <textarea 
                      id="chart-description"
                      value={chartDescription} 
                      onChange={(e) => setChartDescription(e.target.value)}
                      className="chart-input"
                      placeholder="Masukkan deskripsi visualisasi"
                      rows={3}
                    />
                  </div>
                  
                  {/* Tombol Simpan Visualisasi selalu ditampilkan */}
                  <button 
                    className="save-button"
                    onClick={saveVisualization}
                  >
                    Simpan Visualisasi
                  </button>
                    
                  {saveSuccess && (
                    <div className="save-success-message">
                      Visualisasi berhasil disimpan!
                    </div>
                  )}
                    
                  {saveError && (
                    <div className="input-error-message">
                      Visualisasi gagal disimpan!
                    </div>
                  )}
                </div>
              </div>
            )}
            {activeTab === 'analisis' && <Analisis />}
          </div>
        )}
      </Sidebar>
    </div>
  );
};

export default HalamanVisualisasi;