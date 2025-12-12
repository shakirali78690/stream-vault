import { useEffect, useRef, useState } from "react";

function DesktopBanner() {
  const adRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !adRef.current) return;
    initialized.current = true;

    (window as any).atOptions = {
      'key': '30921ee85d2429c2f2753aea3474a6a9',
      'format': 'iframe',
      'height': 90,
      'width': 728,
      'params': {}
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://www.highperformanceformat.com/30921ee85d2429c2f2753aea3474a6a9/invoke.js';
    adRef.current.appendChild(script);
  }, []);

  return <div ref={adRef} className="ad-banner-container"></div>;
}

function MobileBanner() {
  const adRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current || !adRef.current) return;
    initialized.current = true;

    (window as any).atOptions = {
      'key': 'a58a198de44c9cebfbb876b7b669a7fe',
      'format': 'iframe',
      'height': 50,
      'width': 320,
      'params': {}
    };

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = 'https://www.highperformanceformat.com/a58a198de44c9cebfbb876b7b669a7fe/invoke.js';
    adRef.current.appendChild(script);
  }, []);

  return <div ref={adRef} className="ad-banner-container"></div>;
}

export function AdBanner() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="flex justify-center my-6">
      {isMobile ? <MobileBanner /> : <DesktopBanner />}
    </div>
  );
}
