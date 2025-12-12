import { useEffect, useRef } from "react";

interface AdsterraBannerProps {
  className?: string;
}

export function AdsterraNativeBanner({ className = "" }: AdsterraBannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);

  useEffect(() => {
    if (scriptLoaded.current || !containerRef.current) return;
    
    // Check if container already has content (ad already loaded)
    if (containerRef.current.children.length > 0) return;

    scriptLoaded.current = true;

    const script = document.createElement("script");
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    script.src = "https://pl28242823.effectivegatecpm.com/326e4e570b95e9b55f432cac93890441/invoke.js";
    
    containerRef.current.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (containerRef.current) {
        const scripts = containerRef.current.querySelectorAll("script");
        scripts.forEach((s) => s.remove());
      }
    };
  }, []);

  return (
    <div className={`flex justify-center py-4 ${className}`}>
      <div 
        ref={containerRef}
        id="container-326e4e570b95e9b55f432cac93890441"
      />
    </div>
  );
}
