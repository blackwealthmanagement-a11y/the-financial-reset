import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <label className={`field ${className}`.trim()}>
      {label ? <span>{label}</span> : null}
      <input {...props} />
    </label>
  );
}
