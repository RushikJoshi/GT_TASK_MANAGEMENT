import React from 'react';

export default function Input({ icon, className = '', ...props }) {
    return (
        <div className="relative">
            {icon && (
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    {icon}
                </div>
            )}
            <input
                className={`block w-full rounded-xl border border-gray-200 bg-gray-50/50 py-2 ${icon ? 'pl-10' : 'pl-3'} pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-gray-300 focus:bg-white focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all ${className}`}
                {...props}
            />
        </div>
    );
}
