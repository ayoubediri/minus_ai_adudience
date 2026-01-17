import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Download,
  Sparkles,
  ArrowLeft,
  FileText,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '@/components/AppLayout';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ArcElement
);

export default function Analytics() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId ? parseInt(params.sessionId) : 0;
  const [, setLocation] = useLocation();
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const { data: session } = trpc.sessions.getById.useQuery(
    { sessionId },
    { enabled: sessionId > 0 }
  );
  const { data: engagementData } = trpc.engagement.getBySession.useQuery(
    { sessionId },
    { enabled: sessionId > 0 }
  );
  const { data: report, refetch: refetchReport } = trpc.reports.getBySession.useQuery(
    { sessionId },
    { enabled: sessionId > 0 }
  );
  const { data: sessions } = trpc.sessions.list.useQuery();

  // Prepare chart data
  const chartData = {
    labels:
      engagementData?.map((d) => new Date(d.timestamp).toLocaleTimeString()) ||
      [],
    datasets: [
      {
        label: 'Engagement Score',
        data: engagementData?.map((d) => d.averageEngagementScore) || [],
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Boredom %',
        data: engagementData?.map((d) => d.boredomPercentage) || [],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  // Calculate summary statistics
  const avgEngagement =
    engagementData && engagementData.length > 0
      ? engagementData.reduce((sum, d) => sum + d.averageEngagementScore, 0) /
        engagementData.length
      : 0;

  const avgBoredom =
    engagementData && engagementData.length > 0
      ? engagementData.reduce((sum, d) => sum + d.boredomPercentage, 0) /
        engagementData.length
      : 0;

  const peakEngagement =
    engagementData && engagementData.length > 0
      ? Math.max(...engagementData.map((d) => d.averageEngagementScore))
      : 0;

  const lowestEngagement =
    engagementData && engagementData.length > 0
      ? Math.min(...engagementData.map((d) => d.averageEngagementScore))
      : 0;

  const totalFaces =
    engagementData && engagementData.length > 0
      ? Math.max(...engagementData.map((d) => d.totalFaces))
      : 0;

  // Doughnut chart data
  const doughnutData = {
    labels: ['Engaged', 'Neutral', 'Disengaged'],
    datasets: [
      {
        data: [
          100 - avgBoredom - 20,
          20,
          avgBoredom,
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderWidth: 0,
      },
    ],
  };

  // Generate AI report
  const generateReportMutation = trpc.reports.generate.useMutation({
    onSuccess: () => {
      toast.success('AI report generated successfully');
      refetchReport();
      setIsGeneratingReport(false);
    },
    onError: () => {
      toast.error('Failed to generate report');
      setIsGeneratingReport(false);
    },
  });

  const handleGenerateReport = async () => {
    if (!engagementData || engagementData.length === 0) {
      toast.error('No engagement data available');
      return;
    }

    setIsGeneratingReport(true);
    generateReportMutation.mutate({ sessionId });
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!engagementData || engagementData.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Timestamp', 'Total Faces', 'Engaged', 'Neutral', 'Bored', 'Engagement Score', 'Boredom %'];
    const rows = engagementData.map(d => [
      new Date(d.timestamp).toISOString(),
      d.totalFaces,
      d.engagedCount,
      d.neutralCount,
      d.boredCount,
      d.averageEngagementScore.toFixed(1),
      d.boredomPercentage.toFixed(1),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `engagement-data-${sessionId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exported successfully');
  };

  // Overview mode (no session selected)
  if (sessionId === 0) {
    const completedSessions = sessions?.filter(s => s.status === 'completed') || [];
    
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Analytics Overview</h1>
            <p className="text-muted-foreground mt-1">
              Review engagement data from your completed sessions
            </p>
          </div>

          {completedSessions.length === 0 ? (
            <Card className="p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-2">No completed sessions</h3>
              <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                Complete a monitoring session to see analytics and insights here
              </p>
              <Button onClick={() => setLocation('/sessions')}>
                Go to Sessions
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {completedSessions.map((s) => (
                <Card
                  key={s.id}
                  className="p-5 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setLocation(`/analytics/${s.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold">{s.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {s.endTime
                          ? new Date(s.endTime).toLocaleDateString()
                          : 'No date'}
                      </p>
                    </div>
                    <Badge variant="secondary">Completed</Badge>
                  </div>
                  <Button variant="outline" className="w-full mt-2">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    View Report
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>
      </AppLayout>
    );
  }

  // Loading state
  if (!session) {
    return (
      <AppLayout>
        <div className="p-6 lg:p-8 max-w-7xl mx-auto">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
            <Skeleton className="h-28" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/sessions')}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{session.title}</h1>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="secondary"
                  className={
                    session.status === 'completed'
                      ? 'bg-slate-100 text-slate-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }
                >
                  {session.status}
                </Badge>
                {session.endTime && (
                  <span className="text-sm text-muted-foreground">
                    {new Date(session.endTime).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <span className="text-sm text-muted-foreground">Avg Engagement</span>
            </div>
            <p className="text-3xl font-bold">{Math.round(avgEngagement)}%</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <TrendingDown className="w-5 h-5 text-red-600" />
              </div>
              <span className="text-sm text-muted-foreground">Avg Boredom</span>
            </div>
            <p className="text-3xl font-bold">{Math.round(avgBoredom)}%</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm text-muted-foreground">Max Audience</span>
            </div>
            <p className="text-3xl font-bold">{totalFaces}</p>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-sm text-muted-foreground">Data Points</span>
            </div>
            <p className="text-3xl font-bold">{engagementData?.length || 0}</p>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="lg:col-span-2 p-5">
            <h3 className="font-semibold mb-4">Engagement Over Time</h3>
            <div className="h-80">
              {engagementData && engagementData.length > 0 ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No engagement data recorded
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold mb-4">Audience Distribution</h3>
            <div className="h-64 flex items-center justify-center">
              {engagementData && engagementData.length > 0 ? (
                <Doughnut
                  data={doughnutData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                  }}
                />
              ) : (
                <div className="text-muted-foreground text-center">
                  No data available
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* AI Report */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">AI-Powered Insights</h2>
                <p className="text-sm text-muted-foreground">
                  Automated analysis and recommendations
                </p>
              </div>
            </div>
            {!report && (
              <Button
                onClick={handleGenerateReport}
                disabled={
                  isGeneratingReport || !engagementData || engagementData.length === 0
                }
              >
                <Sparkles className="w-4 h-4 mr-2" />
                {isGeneratingReport ? 'Generating...' : 'Generate Report'}
              </Button>
            )}
          </div>

          {report ? (
            <div className="space-y-6">
              <div className="p-4 bg-muted/50 rounded-lg">
                <h3 className="font-medium mb-2">Overall Performance</h3>
                <p className="text-muted-foreground">{report.insights}</p>
              </div>

              <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                <h3 className="font-medium mb-2">Recommendations</h3>
                <p className="text-muted-foreground">{report.recommendations}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <h3 className="font-medium mb-3 text-emerald-700">
                    Successful Moments
                  </h3>
                  <ul className="space-y-2">
                    {report.successfulMoments &&
                      JSON.parse(report.successfulMoments).map(
                        (moment: string, i: number) => (
                          <li
                            key={i}
                            className="text-sm text-emerald-800 flex items-start gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                            {moment}
                          </li>
                        )
                      )}
                  </ul>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h3 className="font-medium mb-3 text-amber-700">
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-2">
                    {report.improvementAreas &&
                      JSON.parse(report.improvementAreas).map(
                        (area: string, i: number) => (
                          <li
                            key={i}
                            className="text-sm text-amber-800 flex items-start gap-2"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                            {area}
                          </li>
                        )
                      )}
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-border flex gap-3">
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Export PDF Report
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-2">No AI report generated yet</p>
              <p className="text-sm text-muted-foreground">
                Click "Generate Report" to analyze this session with AI
              </p>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
