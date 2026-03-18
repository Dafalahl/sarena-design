export default function Button({ children, variant = "primary", className = "", ...props }) {
  const baseStyles = "inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-full transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
  
  const variants = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)]",
    secondary: "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700 focus:ring-slate-500",
    gradient: "bg-gradient-to-r from-indigo-600 to-rose-500 text-white hover:opacity-90 shadow-lg focus:ring-indigo-500"
  };

  return (
    <button className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
