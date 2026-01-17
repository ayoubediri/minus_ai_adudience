import { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
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
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { TrendingUp, Users, Clock, Download, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function Analytics() {
  const [, params] = useRoute('/analytics/:id');
  const sessionId = params?.id ? parseInt(params.id) : 0;
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const { data: session } = trpc.sessions.getById.useQuery({ sessionId });
  const { data: engagementData } = trpc.engagement.getBySession.useQuery({ sessionId });
  const { data: report, refetch: refetchReport } = trpc.reports.getBySession.useQuery({ sessionId });

  // Prepare chart data
  const chartData = {
    labels: engagementData?.map((d) => 
      new Date(d.timestamp).toLocaleTimeString()
    ) || [],
    datasets: [
      {
        label: 'Engagement Score',
        data: engagementData?.map((d) => d.averageEngagementScore) || [],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
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
      title: {
        display: true,
        text: 'Engagement Over Time',
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
  const avgEngagement = engagementData && engagementData.length > 0
    ? engagementData.reduce((sum, d) => sum + d.averageEngagementScore, 0) / engagementData.length
    : 0;

  const avgBoredom = engagementData && engagementData.length > 0
    ? engagementData.reduce((sum, d) => sum + d.boredomPercentage, 0) / engagementData.length
    : 0;

  const peakEngagement = engagementData && engagementData.length > 0
    ? Math.max(...engagementData.map(d => d.averageEngagementScore))
    : 0;

  const lowestEngagement = engagementData && engagementData.length > 0
    ? Math.min(...engagementData.map(d => d.averageEngagementScore))
    : 0;

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

  if (!session) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="container mx-auto max-w-6xl">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold">{session.title}</h1>
            <Badge className={session.status === 'completed' ? 'bg-gray-500' : 'bg-blue-500'}>
              {session.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">Session Analytics and Insights</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Avg Engagement</span>
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{Math.round(avgEngagement)}%</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Avg Boredom</span>
              <Users className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-3xl font-bold">{Math.round(avgBoredom)}%</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Peak</span>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </div>
            <p className="text-3xl font-bold">{Math.round(peakEngagement)}%</p>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Lowest</span>
              <TrendingUp className="w-4 h-4 text-red-500" />
            </div>
            <p className="text-3xl font-bold">{Math.round(lowestEngagement)}%</p>
          </Card>
        </div>

        {/* Engagement Chart */}
        <Card className="p-6 mb-6">
          <div className="h-96">
            <Line data={chartData} options={chartOptions} />
          </div>
        </Card>

        {/* AI Report */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-primary" />
              AI-Powered Insights
            </h2>
            {!report && (
              <Button
                onClick={handleGenerateReport}
                disabled={isGeneratingReport || !engagementData || engagementData.length === 0}
              >
                {isGeneratingReport ? 'Generating...' : 'Generate Report'}
              </Button>
            )}
          </div>

          {report ? (
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Overall Performance</h3>
                <p className="text-muted-foreground">{report.insights}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Recommendations</h3>
                <p className="text-muted-foreground">{report.recommendations}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2 text-green-600">Successful Moments</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {report.successfulMoments && JSON.parse(report.successfulMoments).map((moment: string, i: number) => (
                      <li key={i}>{moment}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold mb-2 text-yellow-600">Areas for Improvement</h3>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    {report.improvementAreas && JSON.parse(report.improvementAreas).map((area: string, i: number) => (
                      <li key={i}>{area}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground mb-4">
                No AI report generated yet. Click "Generate Report" to analyze this session.
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
