import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { LogOut, PlusSquare, Code2, Home, Settings, FileText, Search, X } from 'lucide-react';
import { HttpUtil } from '../utils/HttpUtil';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;

    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);

    useEffect(() => {
        const q = searchParams.get('q');
        if (location.pathname === '/search' && q) {
            setSearchQuery(q);
        }
    }, [location.pathname, searchParams]);

    const handleLogout = () => {
        HttpUtil.clearAuth();
        navigate('/login');
    };

    const handleSearch = (e) => {
        e.preventDefault();
        const query = searchQuery.trim();
        if (query) {
            navigate(`/search?q=${encodeURIComponent(query)}`);
        }
    };

    const clearSearch = () => {
        setSearchQuery('');
    };

    const isActive = (path) => location.pathname === path;
    const isPrefixActive = (prefix) => location.pathname.startsWith(prefix);

    return (
        <nav className="fixed top-0 w-full z-50 glass border-b border-gray-100/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-18 items-center py-2 gap-4">
                    <div className="flex items-center">
                        <Link to="/" className="flex-shrink-0 flex items-center gap-3 group no-underline">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 transition-all duration-300 transform group-hover:scale-105">
                                <Code2 size={22} strokeWidth={2.5} />
                            </div>
                            <span className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600 group-hover:from-blue-600 group-hover:to-indigo-600 transition-all duration-300">
                                IT技术圈
                            </span>
                        </Link>
                    </div>

                    <form onSubmit={handleSearch} className="flex-1 max-w-md mx-4">
                        <div className={`relative transition-all duration-200 ${isSearchFocused ? 'scale-[1.02]' : ''}`}>
                            <Search 
                                size={18} 
                                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" 
                            />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setIsSearchFocused(false)}
                                placeholder="搜索文章标题或内容..."
                                className={`w-full pl-10 pr-9 py-2.5 rounded-xl text-sm transition-all duration-200 outline-none border ${
                                    isSearchFocused 
                                        ? 'bg-white border-blue-300 shadow-md shadow-blue-100/50 ring-2 ring-blue-50' 
                                        : 'bg-gray-50/80 border-transparent hover:bg-gray-50 hover:border-gray-200'
                                }`}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-0.5"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                    </form>
                    
                    <div className="flex items-center space-x-6">
                        <Link 
                            to="/" 
                            className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 font-medium no-underline ${isActive('/') ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-50/80 hover:text-gray-900'}`}
                        >
                            <Home size={18} />
                            <span>首页</span>
                        </Link>

                        <Link 
                            to="/my/articles" 
                            className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 font-medium no-underline ${isPrefixActive('/my') ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-50/80 hover:text-gray-900'}`}
                        >
                            <FileText size={18} />
                            <span>我的文章</span>
                        </Link>

                        <Link 
                            to="/article/create" 
                            className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 font-medium no-underline ${isActive('/article/create') ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-50/80 hover:text-gray-900'}`}
                        >
                            <PlusSquare size={18} />
                            <span>发布</span>
                        </Link>
                        
                        <div className="flex items-center gap-4 pl-6 border-l border-gray-200/60 h-8">
                            <div className="flex flex-col items-end">
                                <span className="text-sm font-bold text-gray-800">{user?.username || 'Guest'}</span>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded-md">{user?.role === 'admin' ? '管理员' : '用户'}</span>
                            </div>
                            {user?.role === 'admin' && (
                                <Link 
                                    to="/admin" 
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-200 font-medium no-underline ${isActive('/admin') ? 'bg-purple-50 text-purple-600 shadow-sm' : 'text-gray-500 hover:bg-purple-50/80 hover:text-purple-600'}`}
                                    title="管理入口"
                                >
                                    <Settings size={18} />
                                    <span className="hidden md:inline">管理</span>
                                </Link>
                            )}
                            <button 
                                onClick={handleLogout}
                                className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all duration-200"
                                title="退出登录"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default Navbar;
