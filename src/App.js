import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Visualisasi from './components/Visualisasi';
import './components/Dashboard.css';
import { DataProvider } from './context/DataContext';

function App() {
  return (
    <DataProvider>
      <div className="app-container">
        <header className="app-header">
          <div className="container">
            <div className="header-content">
              <div className="logo-container">
              <img src="/images.png" alt="Logo" />
                <h1>Rusunami The Jarrdin@Cihampelas</h1>
              </div>
              <p className="header-subtitle">Dashboard Visualisasi dan Analisis Rusunami</p>
            </div>
          </div>
        </header>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/visualisasi" />} />
            <Route path="/visualisasi" element={<Visualisasi activeTabProp="data" />} />
            <Route path="/analisis" element={<Visualisasi activeTabProp="analisis" />} />
          </Routes>
        </main>
        
        <footer className="app-footer">
          <div className="container">
            <p>The Jarrdin@Cihampelas</p>
          </div>
        </footer>
      </div>
    </DataProvider>
  );
}

export default App;