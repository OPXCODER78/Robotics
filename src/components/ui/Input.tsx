import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          className={cn(
            "w-full px-3 py-2 bg-white border rounded-md text-sm shadow-sm placeholder-gray-400",
            "focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary",
            "disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed",
            error ? "border-red-500 focus:border-red-500 focus:ring-red-500" : "border-gray-300",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input; 