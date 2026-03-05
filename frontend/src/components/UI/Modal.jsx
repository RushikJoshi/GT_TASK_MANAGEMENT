import React from 'react';

export default function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/20 backdrop-blur-sm transition-opacity p-4">
            <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] w-full max-w-md border border-gray-100 overflow-hidden transform transition-all animate-fade-in">
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50">
                    <h3 className="text-lg font-semibold text-gray-900 tracking-tight">{title}</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-900 transition-colors p-1.5 rounded-lg hover:bg-gray-100 active:scale-95"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
}
