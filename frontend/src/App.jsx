import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ArticleCreate from './pages/ArticleCreate';
import ArticleEdit from './pages/ArticleEdit';
import ArticleDetail from './pages/ArticleDetail';
import AdminDashboard from './pages/AdminDashboard';
import MyArticles from './pages/MyArticles';
import SearchResults from './pages/SearchResults';
import Profile from './pages/Profile';

import Layout from './components/Layout';
import { HttpUtil } from './utils/HttpUtil';

const ProtectedRoute = ({ children }) => {
    const token = HttpUtil.getToken();
    const location = useLocation();

    if (!token || !HttpUtil.isTokenValid(token)) {
        if (token) {
            HttpUtil.clearAuth();
        }
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    return children;
};

const AdminRoute = ({ children }) => {
    const token = HttpUtil.getToken();
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;
    const location = useLocation();

    if (!token || !HttpUtil.isTokenValid(token)) {
        if (token) {
            HttpUtil.clearAuth();
        }
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    if (user?.role !== 'admin') {
        return <Navigate to="/" replace />;
    }
    return children;
};

const AppContent = () => {
    const location = useLocation();
    
    useEffect(() => {
        const token = HttpUtil.getToken();
        const userJson = localStorage.getItem('user');
        if (token && userJson) {
            if (!HttpUtil.isTokenValid(token)) {
                HttpUtil.clearAuth();
                return;
            }
            try {
                const user = JSON.parse(userJson);
                if (user.role === 'admin' && location.pathname === '/admin') {
                    return;
                }
            } catch (e) {
                HttpUtil.clearAuth();
            }
        }
    }, [location.pathname]);

    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/" element={
                <ProtectedRoute>
                    <Layout />
                </ProtectedRoute>
            }>
                <Route index element={<Dashboard />} />
                <Route path="search" element={<SearchResults />} />
                <Route path="my/articles" element={<MyArticles />} />
                <Route path="profile" element={<Profile />} />
                <Route path="article/create" element={<ArticleCreate />} /> 
                <Route path="article/edit/:id" element={<ArticleEdit />} />
                <Route path="article/:id" element={<ArticleDetail />} />
                <Route path="admin" element={
                    <AdminRoute>
                        <AdminDashboard />
                    </AdminRoute>
                } />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

function App() {
    return (
        <Router>
            <AppContent />
        </Router>
    );
}

export default App;
