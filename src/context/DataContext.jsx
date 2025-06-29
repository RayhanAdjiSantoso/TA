import React, { createContext, useState, useEffect, useContext } from 'react';

const DataContext = createContext();
const API_URL = 'http://localhost:5002/api';

export const DataProvider = ({ children }) => {
  const [masterData, setMasterData] = useState([]);
  const [tagihanData, setTagihanData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [availableTables, setAvailableTables] = useState([]);

  // Fungsi untuk memaksa refresh data
  const refreshData = () => setRefreshTrigger(prev => prev + 1);

  // Fungsi untuk mengambil data dari API
  const fetchData = async (table) => {
    try {
      const response = await fetch(`${API_URL}/data/${table}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${table} data`);
      }
      return await response.json();
    } catch (err) {
      console.error(`Error fetching ${table} data:`, err);
      throw err;
    }
  };

  // Fungsi untuk menjalankan query SQL kustom
  const executeQuery = async (query) => {
    try {
      const response = await fetch(`${API_URL}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute query');
      }
      
      return await response.json();
    } catch (err) {
      console.error('Error executing query:', err);
      throw err;
    }
  };

  useEffect(() => {
    const fetchAllData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Ambil daftar tabel yang tersedia
        const tablesResponse = await fetch(`${API_URL}/tables`);
        const tables = await tablesResponse.json();
        setAvailableTables(tables);
        
        // Ambil data dari tabel master_unit dan tagihan_air
        const [masterResult, tagihanResult] = await Promise.all([
          fetchData('master_unit'),
          fetchData('tagihan_air')
        ]);
        
        setMasterData(masterResult);
        setTagihanData(tagihanResult);
      } catch (err) {
        console.error('Error loading data:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllData();
  }, [refreshTrigger]);

  return (
    <DataContext.Provider value={{ 
      masterData, 
      tagihanData, 
      isLoading, 
      error,
      refreshData,
      availableTables,
      fetchData,
      executeQuery
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => useContext(DataContext);