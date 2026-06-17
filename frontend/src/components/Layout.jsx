import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

const Layout = () => {
    return (
        <div className="min-h-screen bg-gray-50 selection:bg-blue-100 selection:text-blue-900 flex flex-col font-sans">
            <Navbar />
            {/* Added flex-grow to push footer down, and max-w-6xl for better PC containment */}
            <main className="flex-grow pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full">
                <div className="animate-fadeIn w-full">
                    <Outlet />
                </div>
            </main>
            
            <footer className="bg-white/60 backdrop-filter backdrop-blur-sm border-t border-gray-100 py-6 mt-auto">
                <div className="max-w-6xl mx-auto px-4 text-center text-gray-400 text-xs font-medium">
                    <p>© 2024 IT技术交流平台. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
};

export default Layout;
