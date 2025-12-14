import React from 'react';

/**
 * LoadingSpinner - A versatile loading spinner component
 * 
 * @param {string} size - 'sm' | 'md' | 'lg' | 'xl'
 * @param {string} variant - 'default' | 'button' | 'page'
 * @param {string} className - Additional CSS classes
 */
export const LoadingSpinner = ({ 
  size = 'md', 
  variant = 'default',
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
    xl: 'w-12 h-12 border-4',
  };

  const variantClasses = {
    default: 'border-sky-500/30 border-t-sky-500',
    button: 'border-white/30 border-t-white',
    page: 'border-sky-500/30 border-t-sky-500',
  };

  const spinnerClasses = `
    ${sizeClasses[size] || sizeClasses.md}
    ${variantClasses[variant] || variantClasses.default}
    rounded-full animate-spin
    ${className}
  `.trim();

  if (variant === 'page') {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className={spinnerClasses} />
      </div>
    );
  }

  return <div className={spinnerClasses} />;
};

export default LoadingSpinner;
