import { useState, useEffect } from "react";
import { ShieldAlert, Heart, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdBlockDetector() {
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkAdBlocker = async (): Promise<boolean> => {
    try {
      // Method 1: Try to fetch a known ad script
      const response = await fetch(
        "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
        { method: "HEAD", mode: "no-cors" }
      );
      
      // Method 2: Create a bait element
      const bait = document.createElement("div");
      bait.className = "adsbox ad-banner textads banner-ads";
      bait.style.cssText = "position:absolute;left:-9999px;width:1px;height:1px;";
      bait.innerHTML = "&nbsp;";
      document.body.appendChild(bait);
      
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const isBlocked = bait.offsetHeight === 0 || 
                        bait.offsetWidth === 0 || 
                        bait.clientHeight === 0 ||
                        getComputedStyle(bait).display === "none" ||
                        getComputedStyle(bait).visibility === "hidden";
      
      document.body.removeChild(bait);
      
      return isBlocked;
    } catch {
      return true; // If fetch fails, likely blocked
    }
  };

  useEffect(() => {
    const detectAdBlocker = async () => {
      // Wait a bit for page to load
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      const blocked = await checkAdBlocker();
      setAdBlockDetected(blocked);
    };

    detectAdBlocker();

    // Re-check periodically when ad blocker is detected
    const interval = setInterval(async () => {
      if (adBlockDetected && !dismissed) {
        const stillBlocked = await checkAdBlocker();
        if (!stillBlocked) {
          // Ad blocker was disabled, refresh the page
          window.location.reload();
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [adBlockDetected, dismissed]);

  const handleRefresh = async () => {
    setChecking(true);
    const stillBlocked = await checkAdBlocker();
    
    if (!stillBlocked) {
      window.location.reload();
    } else {
      setChecking(false);
      // Show a message that ad blocker is still active
    }
  };

  if (!adBlockDetected || dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="relative mx-4 max-w-lg w-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl border border-gray-700 shadow-2xl overflow-hidden">
        {/* Decorative gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10 pointer-events-none" />
        

        <div className="relative p-8 text-center">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center mb-6 ring-2 ring-red-500/30">
            <ShieldAlert className="w-10 h-10 text-red-400" />
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-3">
            Ad Blocker Detected
          </h2>

          {/* Message */}
          <p className="text-gray-300 mb-6 leading-relaxed">
            We noticed you're using an ad blocker. We understand ads can be annoying, 
            but they're our <span className="text-primary font-semibold">only source of income</span> to 
            keep StreamVault free for everyone.
          </p>

          {/* Benefits */}
          <div className="bg-white/5 rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-gray-400 mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-red-400" />
              By disabling your ad blocker, you help us:
            </p>
            <ul className="text-sm text-gray-300 space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Keep the service 100% free
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Add new movies & shows regularly
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Maintain fast streaming servers
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                Improve the platform for you
              </li>
            </ul>
          </div>

          {/* Instructions */}
          <div className="text-sm text-gray-400 mb-6">
            <p className="font-medium text-gray-300 mb-2">How to disable:</p>
            <p>Click the ad blocker icon in your browser → Disable for this site → Refresh</p>
          </div>

          {/* Button */}
          <Button
            onClick={handleRefresh}
            disabled={checking}
            className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 text-white font-semibold py-3"
          >
            {checking ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                I've Disabled It - Refresh
              </>
            )}
          </Button>

          {/* Auto-refresh notice */}
          <p className="mt-4 text-sm text-gray-400">
            Page will auto-refresh when ad blocker is disabled
          </p>

          {/* Footer note */}
          <p className="mt-6 text-xs text-gray-500">
            We promise to keep ads minimal and non-intrusive. Thank you for your support! 💜
          </p>
        </div>
      </div>
    </div>
  );
}
