import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';

// Generate or get session ID
function getSessionId(): string {
    let sessionId = sessionStorage.getItem('sv_session_id');
    if (!sessionId) {
        sessionId = 'sv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
        sessionStorage.setItem('sv_session_id', sessionId);
    }
    return sessionId;
}

// Track a page view
async function trackPageView(path: string) {
    try {
        await fetch('/api/analytics/pageview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                path,
                sessionId: getSessionId(),
                referrer: document.referrer
            })
        });
    } catch (e) {
        // Silently fail
    }
}

// Track a watch event
export async function trackWatch(contentType: 'show' | 'movie' | 'anime', contentId: string, contentTitle: string, episodeId?: string, duration: number = 0) {
    try {
        await fetch('/api/analytics/watch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contentType,
                contentId,
                contentTitle,
                episodeId,
                duration,
                sessionId: getSessionId()
            })
        });
    } catch (e) {
        // Silently fail
    }
}

// Analytics tracker component - add to App.tsx
export function AnalyticsTracker() {
    const [location] = useLocation();
    const lastPath = useRef<string>('');

    useEffect(() => {
        // Don't track same path twice in a row
        if (location !== lastPath.current) {
            lastPath.current = location;
            trackPageView(location);
        }
    }, [location]);

    return null; // This component doesn't render anything
}

export { getSessionId };
