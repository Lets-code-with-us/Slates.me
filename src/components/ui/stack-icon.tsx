import React from "react";

interface StackIconProps {
  className?: string;
  size?: number;
}

export const StackIcon: React.FC<StackIconProps> = ({ 
  className = "", 
  size = 24 
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      fill="currentColor"
    >
      <path d="M12 2L4 6v12l8 4 8-4V6l-8-4zm6 14.5l-6 3-6-3v-2.33l6 3 6-3v2.33zm0-5l-6 3-6-3v-2.33l6 3 6-3v2.33z" />
    </svg>
  );
};