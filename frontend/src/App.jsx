import React, { useEffect, useState, Component } from 'react';
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

class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50">
                    <div className="text-center p-8 max-w-md">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-gray-800 mb-2">页面加载出错</h2>
                        <p className="text-gray-500 mb-4 text-sm">抱歉，页面遇到了意外错误。请尝试刷新页面。</p>
                        <button
                            onClick={() => {
                                this.setState({ hasError: false, error: null });
                                window.location.reload();
                            }}
                            className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition-colors"
                        >
                            刷新页面
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

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
    let user = null;
    try {
        user = userJson ? JSON.parse(userJson) : null;
    } catch (e) {
        HttpUtil.clearAuth();
    }
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
        <ErrorBoundary>
            <Router>
                <AppContent />
            </Router>
        </ErrorBoundary>
    );
}

export default App;
