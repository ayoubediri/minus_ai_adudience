import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Play, Square, Calendar, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { useLocation } from 'wouter';

export default function Sessions() {
  const [, setLocation] = useLocation();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    description: '',
    alertThreshold: 40,
  });

  const { data: sessions, refetch } = trpc.sessions.list.useQuery();
  const createSessionMutation = trpc.sessions.create.useMutation({
    onSuccess: () => {
      toast.success('Session created successfully');
      setIsCreateDialogOpen(false);
      setNewSession({ title: '', description: '', alertThreshold: 40 });
      refetch();
    },
  });

  const startSessionMutation = trpc.sessions.startSession.useMutation({
    onSuccess: (_, variables) => {
      toast.success('Session started');
      setLocation(`/monitor/${variables.sessionId}`);
      refetch();
    },
  });

  const endSessionMutation = trpc.sessions.endSession.useMutation({
    onSuccess: () => {
      toast.success('Session ended');
      refetch();
    },
  });

  const handleCreateSession = () => {
    if (!newSession.title.trim()) {
      toast.error('Please enter a session title');
      return;
    }

    createSessionMutation.mutate(newSession);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'live':
        return 'bg-green-500';
      case 'completed':
        return 'bg-gray-500';
      case 'scheduled':
        return 'bg-blue-500';
      case 'cancelled':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="container mx-auto max-w-6xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">My Sessions</h1>
            <p className="text-muted-foreground">Manage your presentation sessions</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
                <DialogDescription>
                  Set up a new presentation or meeting session
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Marketing Presentation Q1"
                    value={newSession.title}
                    onChange={(e) =>
                      setNewSession({ ...newSession, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of the session"
                    value={newSession.description}
                    onChange={(e) =>
                      setNewSession({ ...newSession, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="threshold">Alert Threshold (%)</Label>
                  <Input
                    id="threshold"
                    type="number"
                    min="10"
                    max="90"
                    value={newSession.alertThreshold}
                    onChange={(e) =>
                      setNewSession({
                        ...newSession,
                        alertThreshold: parseInt(e.target.value) || 40,
                      })
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Alert when this percentage of audience appears disengaged
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateSession}
                  disabled={createSessionMutation.isPending}
                >
                  Create Session
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {!sessions || sessions.length === 0 ? (
          <Card className="p-12 text-center">
            <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No sessions yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first session to start monitoring audience engagement
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Session
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => (
              <Card key={session.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{session.title}</h3>
                      {session.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {session.description}
                        </p>
                      )}
                    </div>
                    <Badge className={getStatusColor(session.status)}>
                      {session.status}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Alert Threshold</span>
                      <span className="font-medium">{session.alertThreshold}%</span>
                    </div>
                    {session.startTime && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Started</span>
                        <span className="font-medium">
                          {new Date(session.startTime).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-2">
                    {session.status === 'scheduled' && (
                      <Button
                        className="flex-1"
                        size="sm"
                        onClick={() => startSessionMutation.mutate({ sessionId: session.id })}
                        disabled={startSessionMutation.isPending}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start
                      </Button>
                    )}
                    {session.status === 'live' && (
                      <>
                        <Button
                          className="flex-1"
                          size="sm"
                          onClick={() => setLocation(`/monitor/${session.id}`)}
                        >
                          <TrendingUp className="w-4 h-4 mr-2" />
                          Monitor
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => endSessionMutation.mutate({ sessionId: session.id })}
                          disabled={endSessionMutation.isPending}
                        >
                          <Square className="w-4 h-4 mr-2" />
                          End
                        </Button>
                      </>
                    )}
                    {session.status === 'completed' && (
                      <Button
                        className="flex-1"
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/analytics/${session.id}`)}
                      >
                        <TrendingUp className="w-4 h-4 mr-2" />
                        View Report
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
