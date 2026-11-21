import type { InputHTMLAttributes, ButtonHTMLAttributes } from 'react';

export function Field({
  label,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-300 mb-1.5">{label}</span>
      <input
        {...props}
        className="w-full rounded-xl bg-slate-800/80 border border-white/10 px-4 py-2.5 text-white placeholder-slate-500 outline-none focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 transition"
      />
    </label>
  );
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
}) {
  const styles: Record<string, string> = {
    primary:
      'bg-gradient-to-r from-cyan-500 to-sky-500 text-white hover:from-cyan-400 hover:to-sky-400 shadow-lg shadow-cyan-500/25',
    success:
      'bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-400 hover:to-teal-400 shadow-lg shadow-emerald-500/25',
    danger:
      'bg-rose-500/90 text-white hover:bg-rose-500',
    ghost: 'bg-white/5 text-slate-200 hover:bg-white/10 border border-white/10',
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none ${styles[variant]} ${className}`}
    />
  );
}
