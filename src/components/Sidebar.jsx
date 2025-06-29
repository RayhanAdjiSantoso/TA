import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ContainerOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import { Button, Menu } from 'antd';
import './Dashboard.css';

const Sidebar = ({ activeTabProp, children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState(activeTabProp || 'data');
  const navigate = useNavigate();
  
  // Perbarui activeTab ketika activeTabProp berubah
  useEffect(() => {
    if (activeTabProp) {
      setActiveTab(activeTabProp);
    }
  }, [activeTabProp]);

  // Fungsi untuk toggle sidebar
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };
  
  // Fungsi untuk mengubah tab dan URL
  const handleMenuClick = (e) => {
    const key = e.key;
    setActiveTab(key);
    if (key === 'data') {
      navigate('/visualisasi');
    } else if (key === 'analisis') {
      navigate('/analisis');
    }
  };
  
  // Definisi item menu
  const items = [
    { key: 'data', icon: <PieChartOutlined />, label: 'Visualisasi' },
    { key: 'analisis', icon: <ContainerOutlined />, label: 'Analisis' },
  ];

  return (
    <>
      <div className={`sidebar ${collapsed ? 'closed' : 'open'}`}>
        <Button 
          type="primary" 
          onClick={toggleCollapsed} 
          className="sidebar-toggle"
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </Button>
        <Menu
          defaultSelectedKeys={[activeTab]}
          mode="inline"
          theme="light"
          inlineCollapsed={collapsed}
          items={items}
          onClick={handleMenuClick}
          className="sidebar-content"
        />
      </div>
      <div className={`main-content ${collapsed ? 'full-width' : 'with-sidebar'}`}>
        {children}
      </div>
    </>
  );
};

export default Sidebar;