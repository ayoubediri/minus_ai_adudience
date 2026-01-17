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
import { Slider } from '@/components/ui/slider';
import { Plus, Play, Square, TrendingUp, Clock, Users, MoreHorizontal, BarChart3 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useLocation } from 'wouter';
import AppLayout from '@/components/AppLayout';

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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'live':
        return { color: 'bg-emerald-500', text: 'Live', textColor: 'text-emerald-700' };
      case 'completed':
        return { color: 'bg-slate-400', text: 'Completed', textColor: 'text-slate-600' };
      case 'scheduled':
        return { color: 'bg-blue-500', text: 'Ready', textColor: 'text-blue-700' };
      case 'cancelled':
        return { color: 'bg-red-500', text: 'Cancelled', textColor: 'text-red-700' };
      default:
        return { color: 'bg-slate-400', text: status, textColor: 'text-slate-600' };
    }
  };

  // Calculate stats
  const totalSessions = sessions?.length || 0;
  const liveSessions = sessions?.filter(s => s.status === 'live').length || 0;
  const completedSessions = sessions?.filter(s => s.status === 'completed').length || 0;

  return (
    <AppLayout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sessions</h1>
            <p className="text-muted-foreground mt-1">
              Manage and monitor your presentation sessions
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="shadow-sm">
                <Plus className="w-4 h-4 mr-2" />
                New Session
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Session</DialogTitle>
                <DialogDescription>
                  Set up a new presentation or meeting session for audience monitoring
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Session Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Q1 Marketing Presentation"
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
                    rows={3}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Alert Threshold</Label>
                    <span className="text-sm font-medium text-primary">
                      {newSession.alertThreshold}%
                    </span>
                  </div>
                  <Slider
                    value={[newSession.alertThreshold]}
                    onValueChange={(value) =>
                      setNewSession({ ...newSession, alertThreshold: value[0] })
                    }
                    min={10}
                    max={90}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    You'll receive an alert when this percentage of the audience appears disengaged
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
                  {createSessionMutation.isPending ? 'Creating...' : 'Create Session'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-2xl font-bold">{totalSessions}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Live Now</p>
                <p className="text-2xl font-bold">{liveSessions}</p>
              </div>
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <p className="text-2xl font-bold">{completedSessions}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Sessions List */}
        {!sessions || sessions.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No sessions yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              Create your first session to start monitoring audience engagement in real-time
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Session
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {sessions.map((session) => {
              const statusConfig = getStatusConfig(session.status);
              return (
                <Card
                  key={session.id}
                  className="p-5 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`w-2 h-2 rounded-full ${statusConfig.color}`}
                          />
                          <span className={`text-xs font-medium ${statusConfig.textColor}`}>
                            {statusConfig.text}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg truncate">
                          {session.title}
                        </h3>
                        {session.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                            {session.description}
                          </p>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setLocation(`/analytics/${session.id}`)}
                          >
                            View Analytics
                          </DropdownMenuItem>
                          <DropdownMenuItem>Edit Session</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Delete Session
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Info */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-foreground">
                          {session.alertThreshold}%
                        </span>
                        <span>threshold</span>
                      </div>
                      {session.startTime && (
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>
                            {new Date(session.startTime).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      {session.status === 'scheduled' && (
                        <Button
                          className="flex-1"
                          onClick={() =>
                            startSessionMutation.mutate({ sessionId: session.id })
                          }
                          disabled={startSessionMutation.isPending}
                        >
                          <Play className="w-4 h-4 mr-2" />
                          Start Session
                        </Button>
                      )}
                      {session.status === 'live' && (
                        <>
                          <Button
                            className="flex-1"
                            onClick={() => setLocation(`/monitor/${session.id}`)}
                          >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Monitor
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() =>
                              endSessionMutation.mutate({ sessionId: session.id })
                            }
                            disabled={endSessionMutation.isPending}
                          >
                            <Square className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {session.status === 'completed' && (
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => setLocation(`/analytics/${session.id}`)}
                        >
                          <BarChart3 className="w-4 h-4 mr-2" />
                          View Report
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
