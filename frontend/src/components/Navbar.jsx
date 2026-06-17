import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, PlusSquare, Code2, Home } from 'lucide-react';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userJson = localStorage.getItem('user');
    const user = userJson ? JSON.parse(userJson) : null;

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/login');
    };

    const isActive = (path) => location.pathname === path;

    return (
        <nav className="fixed top-0 w-full z-50 glass border-b border-gray-100/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-18 items-center py-2">
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
                    
                    <div className="flex items-center space-x-6">
                        <Link 
                            to="/" 
                            className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 font-medium no-underline ${isActive('/') ? 'bg-blue-50 text-blue-600 shadow-sm' : 'text-gray-600 hover:bg-gray-50/80 hover:text-gray-900'}`}
                        >
                            <Home size={18} />
                            <span>首页</span>
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
