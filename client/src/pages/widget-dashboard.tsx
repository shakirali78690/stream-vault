import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Helmet } from 'react-helmet-async';
import {
    BarChart3,
    MousePointer,
    Eye,
    TrendingUp,
    Globe,
    ArrowLeft,
    RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WidgetAnalytics {
    summary: {
        clicks: { today: number; week: number; month: number; total: number };
        views: { today: number; week: number; month: number; total: number };
        ctr: string;
    };
    clicksByReferrer: Record<string, number>;
    dailyClicks: { date: string; clicks: number }[];
    recentClicks: { timestamp: string; referrer: string; userAgent: string }[];
}

export default function WidgetDashboard() {
    const [, setLocation] = useLocation();
    const [analytics, setAnalytics] = useState<WidgetAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAnalytics = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            if (!token) {
                setLocation('/admin');
                return;
            }

            const res = await fetch('/api/widget/analytics', {
                headers: { 'x-admin-token': token }
            });

            if (!res.ok) {
                if (res.status === 401) {
                    setLocation('/admin');
                    return;
                }
                throw new Error('Failed to fetch analytics');
            }

            const data = await res.json();
            setAnalytics(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAnalytics();
        // Refresh every 30 seconds
        const interval = setInterval(fetchAnalytics, 30000);
        return () => clearInterval(interval);
    }, []);

    const maxDailyClicks = analytics?.dailyClicks
        ? Math.max(...analytics.dailyClicks.map(d => d.clicks), 1)
        : 1;

    return (
        <>
            <Helmet>
                <title>Widget Analytics | StreamVault Admin</title>
            </Helmet>

            <div className="min-h-screen bg-background p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setLocation('/admin')}
                            >
                                <ArrowLeft className="w-5 h-5" />
                            </Button>
                            <div>
                                <h1 className="text-2xl font-bold">Widget Analytics</h1>
                                <p className="text-muted-foreground">Track WorthCrete widget performance</p>
                            </div>
                        </div>
                        <Button onClick={fetchAnalytics} variant="outline" disabled={loading}>
                            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                            Refresh
                        </Button>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6">
                            {error}
                        </div>
                    )}

                    {analytics && (
                        <>
                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                                {/* Clicks Today */}
                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-muted-foreground text-sm">Clicks Today</span>
                                        <MousePointer className="w-5 h-5 text-primary" />
                                    </div>
                                    <p className="text-3xl font-bold">{analytics.summary.clicks.today}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Week: {analytics.summary.clicks.week} | Total: {analytics.summary.clicks.total}
                                    </p>
                                </div>

                                {/* Views Today */}
                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-muted-foreground text-sm">Views Today</span>
                                        <Eye className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <p className="text-3xl font-bold">{analytics.summary.views.today}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Week: {analytics.summary.views.week} | Total: {analytics.summary.views.total}
                                    </p>
                                </div>

                                {/* CTR */}
                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-muted-foreground text-sm">Click-Through Rate</span>
                                        <TrendingUp className="w-5 h-5 text-green-500" />
                                    </div>
                                    <p className="text-3xl font-bold">{analytics.summary.ctr}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Clicks / Views
                                    </p>
                                </div>

                                {/* Top Source */}
                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-muted-foreground text-sm">Top Source</span>
                                        <Globe className="w-5 h-5 text-purple-500" />
                                    </div>
                                    <p className="text-xl font-bold truncate">
                                        {Object.keys(analytics.clicksByReferrer)[0] || 'N/A'}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {Object.values(analytics.clicksByReferrer)[0] || 0} clicks
                                    </p>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                                {/* Daily Clicks Chart */}
                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center gap-2 mb-4">
                                        <BarChart3 className="w-5 h-5 text-primary" />
                                        <h2 className="font-semibold">Daily Clicks (Last 7 Days)</h2>
                                    </div>
                                    <div className="flex items-end gap-2 h-40">
                                        {analytics.dailyClicks.map((day, i) => (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                                <div
                                                    className="w-full bg-primary rounded-t transition-all"
                                                    style={{
                                                        height: `${(day.clicks / maxDailyClicks) * 100}%`,
                                                        minHeight: day.clicks > 0 ? '4px' : '0'
                                                    }}
                                                />
                                                <span className="text-xs text-muted-foreground">
                                                    {new Date(day.date).toLocaleDateString('en', { weekday: 'short' })}
                                                </span>
                                                <span className="text-xs font-medium">{day.clicks}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Clicks by Source */}
                                <div className="bg-card p-6 rounded-xl border">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Globe className="w-5 h-5 text-purple-500" />
                                        <h2 className="font-semibold">Clicks by Source</h2>
                                    </div>
                                    <div className="space-y-3">
                                        {Object.entries(analytics.clicksByReferrer)
                                            .sort(([, a], [, b]) => b - a)
                                            .slice(0, 5)
                                            .map(([domain, clicks]) => (
                                                <div key={domain} className="flex items-center gap-3">
                                                    <div className="flex-1">
                                                        <div className="flex justify-between text-sm mb-1">
                                                            <span className="truncate">{domain}</span>
                                                            <span className="font-medium">{clicks}</span>
                                                        </div>
                                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-primary rounded-full"
                                                                style={{
                                                                    width: `${(clicks / analytics.summary.clicks.total) * 100}%`
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        {Object.keys(analytics.clicksByReferrer).length === 0 && (
                                            <p className="text-muted-foreground text-sm">No clicks recorded yet</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Recent Clicks */}
                            <div className="bg-card p-6 rounded-xl border">
                                <h2 className="font-semibold mb-4">Recent Clicks</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-2 px-3">Time</th>
                                                <th className="text-left py-2 px-3">Referrer</th>
                                                <th className="text-left py-2 px-3">User Agent</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.recentClicks.map((click, i) => (
                                                <tr key={i} className="border-b last:border-0">
                                                    <td className="py-2 px-3 whitespace-nowrap">
                                                        {new Date(click.timestamp).toLocaleString()}
                                                    </td>
                                                    <td className="py-2 px-3 text-muted-foreground truncate max-w-xs">
                                                        {click.referrer}
                                                    </td>
                                                    <td className="py-2 px-3 text-muted-foreground truncate max-w-xs">
                                                        {click.userAgent}
                                                    </td>
                                                </tr>
                                            ))}
                                            {analytics.recentClicks.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="py-4 text-center text-muted-foreground">
                                                        No clicks recorded yet
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}

                    {loading && !analytics && (
                        <div className="flex items-center justify-center py-20">
                            <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
