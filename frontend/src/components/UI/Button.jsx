import React from 'react';

export default function Button({ children, variant = 'primary', className = '', ...props }) {
    const baseStyle = "inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 outline-none text-sm px-4 py-2.5 active:scale-[0.98]";

    const variants = {
        primary: "bg-gray-900 text-white hover:bg-gray-800 shadow-sm border border-transparent",
        secondary: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 shadow-sm",
        accent: "bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200 shadow-sm",
        ghost: "bg-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-transparent",
    };

    return (
        <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
            {children}
        </button>
    );
}
