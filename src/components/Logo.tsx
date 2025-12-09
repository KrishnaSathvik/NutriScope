export default function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center ${className}`}>
      <span className="text-lg sm:text-xl md:text-2xl font-semibold tracking-tight text-text font-sans flex items-center">
        NutriSc
        <span className="relative inline-block ml-0.5 w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-teal-500 shadow-md shadow-orange-500/30"></span>
        pe
      </span>
    </div>
  )
}
