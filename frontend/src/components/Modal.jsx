import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

const Modal = ({ isOpen, onClose, onConfirm, title, message }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-40 backdrop-filter backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full transform transition-all scale-100 hover:scale-[1.02]">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="p-2 bg-red-100 rounded-full text-red-500">
                            <AlertTriangle size={24} />
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-6">
                        {message}
                    </p>
                    
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="flex-1 px-4 py-2 bg-gray-50 text-gray-700 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            onClick={onConfirm}
                            className="flex-1 px-4 py-2 bg-red-500 text-white font-semibold rounded-xl hover:bg-red-600 shadow-lg shadow-red-500/30 transition-colors"
                        >
                            确认删除
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;
