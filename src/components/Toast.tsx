import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div id="toast" role="status" style={{ display: 'block' }}>
      {message}
    </div>
  );
};
