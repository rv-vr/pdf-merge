import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ExternalLink, Heart, GitFork } from 'lucide-react';

interface GitHubUser {
  login: string;
  name: string | null;
  bio: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  followers: number;
}

interface DevEntry {
  username: string;
  role: string;
}

const DEVS: DevEntry[] = [
  { username: 'justCallMeJeg', role: 'Frontend' },
  { username: 'rv-vr', role: 'Backend' },
];

interface DevCardProps {
  dev: DevEntry;
  user: GitHubUser | null;
  loading: boolean;
}

function DevCard({ dev, user, loading }: DevCardProps) {
  return (
    <div className="relative flex flex-col gap-4 rounded-xl border border-border bg-muted/30 p-5 transition-all duration-300 hover:border-primary/40 hover:bg-muted/50 hover:shadow-lg">
      {/* Avatar + identity */}
      <div className="flex items-center gap-4">
        {loading ? (
          <Skeleton className="size-16 rounded-full" />
        ) : (
          <div className="relative shrink-0">
            <img
              src={user?.avatar_url}
              alt={user?.name ?? dev.username}
              className="size-16 rounded-full border-2 border-border object-cover ring-2 ring-primary/20 ring-offset-2 ring-offset-background transition-all duration-300 hover:ring-primary/60"
            />
            <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-primary-foreground">
              {dev.role}
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1 overflow-hidden">
          {loading ? (
            <>
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </>
          ) : (
            <>
              <p className="truncate text-sm font-bold leading-tight text-foreground">
                {user?.name ?? dev.username}
              </p>
              <p className="font-mono text-xs text-muted-foreground">@{user?.login ?? dev.username}</p>
            </>
          )}
        </div>
      </div>

      {/* Bio */}
      <div className="min-h-10">
        {loading ? (
          <div className="flex flex-col gap-1.5">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ) : (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {user?.bio ?? 'No bio available.'}
          </p>
        )}
      </div>

      {/* Stats */}
      {!loading && user && (
        <div className="flex gap-4 border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span>
            <strong className="text-foreground">{user.public_repos}</strong> repos
          </span>
          <span>
            <strong className="text-foreground">{user.followers}</strong> followers
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href={user?.html_url ?? `https://github.com/${dev.username}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <GitFork className="size-3.5" />
          GitHub
          <ExternalLink className="size-2.5 opacity-50" />
        </a>
      </div>
    </div>
  );
}

interface DevsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const INITIAL_STATE = { loading: true, users: [null, null] as (GitHubUser | null)[] };

export function DevsDialog({ open, onOpenChange }: DevsDialogProps) {
  const [{ loading, users }, setState] = useState(INITIAL_STATE);

  useEffect(() => {
    if (!open) return;

    Promise.all(
      DEVS.map((dev) =>
        fetch(`https://api.github.com/users/${dev.username}`)
          .then((r) => r.json())
          .catch(() => null)
      )
    ).then((results) => {
      setState({ loading: false, users: results });
    });

    return () => setState(INITIAL_STATE);
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Meet the Developers</DialogTitle>
          <DialogDescription>The team behind PDF Merge.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4   py-2 sm:grid-cols-2">
          {DEVS.map((dev, i) => (
            <DevCard key={dev.username} dev={dev} user={users[i]} loading={loading} />
          ))}
        </div>

        <a
          href="https://ko-fi.com/rovvvr"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#FF5E5B]/30 bg-[#FF5E5B]/10 px-4 py-2.5 text-sm font-medium text-[#FF5E5B] transition-colors hover:bg-[#FF5E5B]/20"
        >
          <Heart className="size-4 fill-current" />
          Support the developers on Ko-fi
          <ExternalLink className="size-3 opacity-50" />
        </a>
      </DialogContent>
    </Dialog>
  );
}
