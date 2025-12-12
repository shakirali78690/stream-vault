import { useEffect, useRef } from "react";

export function AdBanner() {
  const adRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !adRef.current) return;
    initialized.current = true;

    // Set atOptions on window
    (window as any).atOptions = {
      'key': '30921ee85d2429c2f2753aea3474a6a9',
      'format': 'iframe',
      'height': 90,
      'width': 728,
      'params': {}
    };

    // Create and append the script
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://www.highperformanceformat.com/30921ee85d2429c2f2753aea3474a6a9/invoke.js';
    adRef.current.appendChild(script);
  }, []);

  return (
    <div className="flex justify-center my-6">
      <div ref={adRef} className="ad-banner-container"></div>
    </div>
  );
}
