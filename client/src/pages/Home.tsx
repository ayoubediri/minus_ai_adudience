import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Video, TrendingUp, Bell, Users, BarChart3, Sparkles } from "lucide-react";
import { useLocation } from "wouter";

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isAuthenticated && user) {
    setLocation('/sessions');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary">
      {/* Hero Section */}
      <div className="container mx-auto px-6 pt-20 pb-16">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Never Lose Your Audience Again
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Real-time audience engagement monitoring powered by AI and computer vision. 
            Get instant alerts when your audience starts to disengage.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" asChild>
              <a href={getLoginUrl()}>
                Get Started Free
              </a>
            </Button>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-Time Video Analysis</h3>
            <p className="text-muted-foreground">
              Process video streams from webcams, IP cameras, or video files using advanced 
              MediaPipe and TensorFlow.js technology.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Emotion Detection</h3>
            <p className="text-muted-foreground">
              Detect boredom, engagement, and negative emotions through facial expressions, 
              body posture, and behavioral cues.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Alerts</h3>
            <p className="text-muted-foreground">
              Receive instant notifications via vibration, sound, or visual alerts when 
              engagement drops below your custom threshold.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Live Dashboard</h3>
            <p className="text-muted-foreground">
              Monitor engagement metrics in real-time with intuitive visualizations and 
              heatmaps showing audience sentiment.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Session Analytics</h3>
            <p className="text-muted-foreground">
              Review detailed post-session analytics with engagement trends, peak moments, 
              and areas for improvement.
            </p>
          </Card>

          <Card className="p-6 hover:shadow-lg transition-shadow">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered Insights</h3>
            <p className="text-muted-foreground">
              Get actionable recommendations and insights from AI analysis of your 
              presentation performance.
            </p>
          </Card>
        </div>

        {/* Use Cases */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">Perfect For</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6">
              <div className="text-4xl mb-4">🎤</div>
              <h3 className="font-semibold mb-2">Speakers & Presenters</h3>
              <p className="text-sm text-muted-foreground">
                Deliver more engaging presentations and keynotes
              </p>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl mb-4">👨‍🏫</div>
              <h3 className="font-semibold mb-2">Teachers & Educators</h3>
              <p className="text-sm text-muted-foreground">
                Keep students engaged during online and in-person classes
              </p>
            </div>
            <div className="text-center p-6">
              <div className="text-4xl mb-4">💼</div>
              <h3 className="font-semibold mb-2">Business Professionals</h3>
              <p className="text-sm text-muted-foreground">
                Run more effective meetings and training sessions
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-2xl mx-auto text-center mt-16">
          <Card className="p-8 bg-primary/5 border-primary/20">
            <h2 className="text-2xl font-bold mb-4">Ready to Transform Your Presentations?</h2>
            <p className="text-muted-foreground mb-6">
              Join hundreds of speakers who are delivering more engaging presentations with 
              real-time audience insights.
            </p>
            <Button size="lg" asChild>
              <a href={getLoginUrl()}>
                Start Monitoring Now
              </a>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
