import React from 'react';

interface LogoProps {
  darkMode: boolean;
}

const Logo: React.FC<LogoProps> = ({ darkMode }) => {
  return (
    <div className="flex items-center gap-2">
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={darkMode ? "text-blue-400" : "text-blue-600"}
      >
        <path
          d="M12 2L2 22H22L12 2Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={darkMode ? "rgba(96, 165, 250, 0.2)" : "rgba(37, 99, 235, 0.1)"}
        />
        <circle cx="12" cy="14" r="3" fill="currentColor" />
        <path d="M12 2V8" stroke="currentColor" strokeWidth="2" />
      </svg>
      <span className={`text-xl font-bold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Prism<span className={darkMode ? 'text-blue-400' : 'text-blue-600'}>AI</span> Learn
      </span>
    </div>
  );
};

export default Logo;