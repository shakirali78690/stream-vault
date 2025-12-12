import { useState, useEffect } from "react";
import { ShieldOff, Heart, RefreshCw, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

export function AdBlockDetector() {
  const [adBlockDetected, setAdBlockDetected] = useState(false);
  const [checking, setChecking] = useState(false);

  const checkAdBlocker = async (): Promise<boolean> => {
    try {
      // Method 1: Try to fetch a known ad script
      await fetch(
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
      return true;
    }
  };

  useEffect(() => {
    const detectAdBlocker = async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const blocked = await checkAdBlocker();
      setAdBlockDetected(blocked);
    };

    detectAdBlocker();

    const interval = setInterval(async () => {
      if (adBlockDetected) {
        const stillBlocked = await checkAdBlocker();
        if (!stillBlocked) {
          window.location.reload();
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [adBlockDetected]);

  const handleRefresh = async () => {
    setChecking(true);
    const stillBlocked = await checkAdBlocker();
    
    if (!stillBlocked) {
      window.location.reload();
    } else {
      setChecking(false);
    }
  };

  if (!adBlockDetected) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-md">
      <div className="mx-4 max-w-md w-full bg-card border border-border rounded-lg overflow-hidden">
        {/* Header with logo */}
        <div className="bg-primary/10 border-b border-border px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
            <Play className="w-5 h-5 text-primary-foreground fill-current" />
          </div>
          <span className="text-xl font-bold text-foreground">StreamVault</span>
        </div>

        <div className="p-6">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <ShieldOff className="w-8 h-8 text-destructive" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-semibold text-foreground text-center mb-2">
            Ad Blocker Detected
          </h2>

          {/* Message */}
          <p className="text-muted-foreground text-center text-sm mb-6">
            Please disable your ad blocker to continue. Ads are our{" "}
            <span className="text-primary font-medium">only source of income</span>{" "}
            to keep StreamVault free.
          </p>

          {/* Benefits card */}
          <div className="bg-muted/50 rounded-md p-4 mb-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <Heart className="w-4 h-4 text-primary" />
              <span>Your support helps us:</span>
            </div>
            <ul className="text-sm text-foreground space-y-1.5 ml-6">
              <li>• Keep streaming 100% free</li>
              <li>• Add new content regularly</li>
              <li>• Maintain fast servers</li>
            </ul>
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground text-center mb-4 bg-accent/50 rounded-md p-3">
            <strong className="text-foreground">How to disable:</strong> Click the ad blocker icon → Disable for this site
          </div>

          {/* Button */}
          <Button
            onClick={handleRefresh}
            disabled={checking}
            className="w-full"
            size="lg"
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
          <p className="mt-4 text-xs text-muted-foreground text-center">
            Page will auto-refresh when ad blocker is disabled
          </p>
        </div>
      </div>
    </div>
  );
}
