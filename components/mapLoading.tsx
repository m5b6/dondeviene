export default function MapPlaceholder() {
  return (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center overflow-hidden">
      <div className="grid grid-cols-10 grid-rows-10 h-full w-full opacity-10">
        {Array.from({ length: 100 }).map((_, i) => (
          <div key={i} className={`border border-gray-300 ${i % 2 === 0 ? "bg-gray-200" : "bg-gray-100"}`} />
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-black opacity-5 animate-pulse" />
        <div
          className="absolute w-24 h-24 rounded-full border-2 border-black opacity-5 animate-pulse"
          style={{ animationDelay: "0.5s" }}
        />
        <div
          className="absolute w-32 h-32 rounded-full border border-black opacity-5 animate-pulse"
          style={{ animationDelay: "1s" }}
        />
      </div>
    </div>
  )
}
