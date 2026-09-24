"use client";
import Image from "next/image";
import { useState, type CSSProperties } from "react";
import { Box } from "lucide-react";
export function ModelPoster({
  id,
  title,
  className = "",
  priority = false,
  src,
  style,
}: {
  id: string;
  title: string;
  className?: string;
  priority?: boolean;
  src?: string;
  style?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div style={style} className={`relative flex items-center justify-center ${className}`}>
      {failed ? (
        <div className="flex flex-col items-center gap-3 p-8 text-muted-foreground">
          <Box size={48} />
          <span>Preview unavailable. Model controls remain available.</span>
        </div>
      ) : (
        <Image
          src={src ?? `/assets/previews/${id}.svg`}
          alt={`${title}, original brick model preview`}
          width={1000}
          height={760}
          priority={priority}
          onError={() => setFailed(true)}
          className="h-full w-full object-contain"
          unoptimized
        />
      )}
    </div>
  );
}
