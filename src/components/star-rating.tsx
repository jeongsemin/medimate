import { Star } from "lucide-react";

export function StarRating({ value, size = "size-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex" role="img" aria-label={`${value} / 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${size} ${n <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-border"}`}
          aria-hidden
        />
      ))}
    </span>
  );
}
