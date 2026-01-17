import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { getLoginUrl } from '@/const';
import { useLocation } from 'wouter';
import {
  Camera,
  BarChart3,
  Bell,
  Users,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Globe,
} from 'lucide-react';

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  const features = [
    {
      icon: Camera,
      title: 'Real-Time Detection',
      description:
        'Advanced computer vision analyzes facial expressions and body language to detect engagement levels instantly.',
    },
    {
      icon: Bell,
      title: 'Smart Alerts',
      description:
        'Receive customizable alerts via vibration, sound, or visual indicators when audience engagement drops.',
    },
    {
      icon: BarChart3,
      title: 'Detailed Analytics',
      description:
        'Track engagement trends over time with comprehensive charts and exportable reports.',
    },
    {
      icon: Sparkles,
      title: 'AI Insights',
      description:
        'Get AI-powered recommendations to improve your presentation skills based on audience response.',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description:
        'Add assistants to receive alerts and help manage audience engagement during presentations.',
    },
    {
      icon: Globe,
      title: 'Multiple Sources',
      description:
        'Connect webcams, IP cameras, or external video sources to monitor any audience setting.',
    },
  ];

  const benefits = [
    'Detect boredom and disengagement in real-time',
    'Improve presentation delivery with actionable insights',
    'Keep your audience engaged throughout sessions',
    'Export detailed reports for continuous improvement',
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Camera className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">EngageView</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
          </nav>

          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button onClick={() => setLocation('/sessions')}>
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <a href={getLoginUrl()}>Sign In</a>
                </Button>
                <Button asChild>
                  <a href={getLoginUrl()}>Get Started</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              AI-Powered Audience Analysis
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Know When Your Audience
              <span className="text-primary block mt-2">Loses Interest</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Real-time engagement monitoring using computer vision. Get instant
              alerts when your audience shows signs of boredom, and improve your
              presentations with AI-powered insights.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              {isAuthenticated ? (
                <Button size="lg" onClick={() => setLocation('/sessions')}>
                  Start Monitoring
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              ) : (
                <Button size="lg" asChild>
                  <a href={getLoginUrl()}>
                    Start Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </a>
                </Button>
              )}
              <Button size="lg" variant="outline" asChild>
                <a href="#features">Learn More</a>
              </Button>
            </div>

            {/* Benefits */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Powerful Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need to understand and improve audience engagement
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes with our simple three-step process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="font-semibold text-lg mb-2">Connect Your Camera</h3>
              <p className="text-muted-foreground text-sm">
                Use your webcam or connect external cameras to capture your audience
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="font-semibold text-lg mb-2">Set Your Threshold</h3>
              <p className="text-muted-foreground text-sm">
                Configure when you want to be alerted about audience disengagement
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="font-semibold text-lg mb-2">Present with Confidence</h3>
              <p className="text-muted-foreground text-sm">
                Get real-time alerts and post-session insights to improve continuously
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Presentations?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join speakers, teachers, and presenters who use EngageView to deliver
            more engaging content.
          </p>
          {isAuthenticated ? (
            <Button
              size="lg"
              variant="secondary"
              onClick={() => setLocation('/sessions')}
            >
              Go to Dashboard
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button size="lg" variant="secondary" asChild>
              <a href={getLoginUrl()}>
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
            </Button>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
                <Camera className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-medium">EngageView</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Real-time audience engagement monitoring
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
