export const authStyles = {
  container: "min-h-screen flex items-center justify-center p-0 md:p-6 lg:p-10 relative overflow-hidden bg-[#f1f5f9]",
  
  wrapper: "w-full max-w-[1100px] min-h-[600px] flex flex-col md:flex-row bg-white rounded-none md:rounded-3xl overflow-hidden shadow-2xl border border-gray-100 animate-fadeIn",
  
  leftSide: "hidden md:flex md:w-5/12 lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-[#1e40af] via-[#3730a3] to-[#5b21b6] text-white relative",
  
  rightSide: "flex-1 flex flex-col justify-center p-8 md:p-10 lg:p-16 bg-white",
  
  card: "w-full max-w-sm mx-auto space-y-6",
  title: "text-3xl font-black text-[#0f172a] tracking-tight",
  subtitle: "text-sm font-medium text-[#475569] mt-2",
  inputGroup: "space-y-1.5 group",
  label: "block text-xs font-bold text-[#64748b] ml-1 transition-colors group-focus-within:text-[#1e40af]",
  input: "w-full px-5 py-3 rounded-xl border border-[#cbd5e1] bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-[#1e40af] transition-all duration-300 outline-none text-[#0f172a] placeholder-[#94a3b8] text-sm font-medium",
  inputError: "w-full px-5 py-3 rounded-xl border border-red-400 bg-red-50 focus:ring-4 focus:ring-red-500/10 focus:border-red-500 transition-all duration-300 outline-none text-[#0f172a] placeholder-[#94a3b8] text-sm font-medium",
  button: "w-full py-3.5 px-4 bg-[#1e40af] hover:bg-[#1e3a8a] text-white font-bold rounded-xl active:scale-[0.98] outline-none shadow-lg shadow-blue-500/20 transition-all duration-200 text-sm",
  link: "font-bold text-[#1e40af] hover:text-[#1e3a8a] transition-all text-xs",
  error: "p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs flex items-center gap-3 animate-fadeIn",
  fieldError: "text-xs text-red-500 mt-1.5 ml-1 flex items-center gap-1 animate-fadeIn"
};
