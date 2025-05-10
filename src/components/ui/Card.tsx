import { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export default function Card({ children, className }: CardProps) {
  return (
    <div className={cn("bg-white rounded-lg shadow-md dark:bg-gray-800 border border-gray-200 dark:border-gray-700", className)}>
      {children}
    </div>
  );
} 