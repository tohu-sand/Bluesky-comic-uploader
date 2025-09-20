import { useEffect, useMemo, useRef } from 'react';
import { StepHeader } from '@components/ui/StepHeader';
import { Button } from '@components/ui/Button';
import { IntroStep } from '@components/steps/IntroStep';
import { AuthStep } from '@components/steps/AuthStep';
import { IngestStep } from '@components/steps/IngestStep';
import { PreviewStep } from '@components/steps/PreviewStep';
import { ComposeStep } from '@components/steps/ComposeStep';
import { ReviewStep } from '@components/steps/ReviewStep';
import { PostStep } from '@components/steps/PostStep';
import { CompleteStep } from '@components/steps/CompleteStep';
import { useAppStore, type WizardStep } from '@stores/appStore';
import { handleAuthorizationCallback } from '@modules/auth/callback';
import { persistSession, loadPersistedSession, setMemorySession, clearPersistedSession } from '@modules/auth/sessionStore';
import type { AuthContext } from '@modules/auth/context';
import { PosterService } from '@modules/poster/service';
import { SchedulerService } from '@modules/scheduler/service';
import { listSchedulerEntries, deleteSchedulerEntry } from '@modules/scheduler/storage';
import { ensureFreshAuthContext } from '@modules/auth/refresh';

const PERSIST_KEY = 'bsky_persist_tokens';

export function App() {
  const {
    step,
    session,
    dpopKeyPair,
    appPasswordSession,
    actions
  } = useAppStore();
  const schedulerRef = useRef<SchedulerService | null>(null);

  const authContext = useMemo<AuthContext | null>(() => {
    if (session && dpopKeyPair) {
      return { type: 'oauth', session, dpopKeyPair };
    }
    if (appPasswordSession) {
      return {
        type: 'app-password',
        service: appPasswordSession.service,
        did: appPasswordSession.did,
        accessJwt: appPasswordSession.accessJwt,
        refreshJwt: appPasswordSession.refreshJwt
      } as const;
    }
    return null;
  }, [session, dpopKeyPair, appPasswordSession]);

  useEffect(() => {
    setMemorySession(session, dpopKeyPair ?? null);
  }, [session, dpopKeyPair]);

  useEffect(() => {
    if (session && dpopKeyPair && localStorage.getItem(PERSIST_KEY) === 'true') {
      void persistSession(session, dpopKeyPair);
    }
  }, [session, dpopKeyPair]);

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    void (async () => {
      try {
        const result = await handleAuthorizationCallback(currentUrl);
        if (result) {
          actions.setSession(result.session, result.dpopKeyPair, result.config);
          actions.setStep('ingest');
          if (localStorage.getItem(PERSIST_KEY) === 'true') {
            await persistSession(result.session, result.dpopKeyPair);
          }
          history.replaceState({}, '', `${window.location.pathname}${window.location.hash}`);
        }
      } catch (error) {
        console.error(error);
      }
    })();
  }, [actions]);

  useEffect(() => {
    if (session || appPasswordSession) return;
    void (async () => {
      const persisted = await loadPersistedSession();
      if (persisted) {
        actions.setSession(persisted.session, persisted.dpopKeyPair);
        actions.setStep('ingest');
      }
    })();
  }, [actions, session, appPasswordSession]);

  useEffect(() => {
    void (async () => {
      const entries = await listSchedulerEntries();
      actions.setSchedulerEntries(entries);
    })();
  }, [actions]);

  useEffect(() => {
    if (!authContext) return;
    if (!schedulerRef.current) {
      schedulerRef.current = new SchedulerService(async (entry, imageGroups) => {
        try {
          const state = useAppStore.getState();
          const refreshed = await ensureFreshAuthContext({
            session: state.session,
            dpopKeyPair: state.dpopKeyPair,
            oauthConfig: state.oauthConfig,
            appPasswordSession: state.appPasswordSession
          });
          if (!refreshed.context) {
            throw new Error('Authentication context is unavailable for scheduled posting.');
          }
          if (refreshed.refreshed) {
            if (refreshed.session) {
              if (!state.dpopKeyPair) {
                throw new Error('Missing DPoP key pair while refreshing OAuth session.');
              }
              state.actions.setSession(refreshed.session, state.dpopKeyPair, state.oauthConfig ?? undefined);
            } else if (refreshed.appPasswordSession) {
              state.actions.setAppPasswordSession(refreshed.appPasswordSession);
            }
          }
          const plan = {
            entries: entry.groups.map((group, index) => ({
              id: group.id ?? String(index + 1),
              text: group.text,
              images: imageGroups[index] ?? [],
              ...(group.facets ? { facets: group.facets } : {})
            })),
            totalPosts: entry.groups.length,
            totalImages: imageGroups.reduce((sum, group) => sum + group.length, 0)
          };
          const service = new PosterService(refreshed.context);
          actions.setSchedulerEnabled(false);
          actions.setScheduledAt(null);
          actions.resetProgress();
          actions.setStep('post');
          const result = await service.postPlan(plan, {
            compressionMode: useAppStore.getState().compressionMode,
            onUploadProgress: (payload) => actions.updateUploadProgress(payload.imageId, payload),
            onPostProgress: (payload) => actions.updatePostProgress(payload.postId, payload)
          });
          await deleteSchedulerEntry(entry.id);
          const entries = await listSchedulerEntries();
          actions.setSchedulerEntries(entries);
          actions.setThreadResult(result);
          actions.setStep('complete');
        } catch (error) {
          console.error('Scheduled post failed', error);
          const entries = await listSchedulerEntries();
          actions.setSchedulerEntries(entries);
          actions.setStep('post');
        } finally {
          imageGroups.flat().forEach((image) => {
            URL.revokeObjectURL(image.objectUrl);
            if (image.thumbnailUrl) URL.revokeObjectURL(image.thumbnailUrl);
          });
        }
      });
    }
    schedulerRef.current.start();
    return () => schedulerRef.current?.stop();
  }, [authContext]);

  const handleSignOut = () => {
    actions.resetApp();
    void clearPersistedSession();
    setMemorySession(null, null);
  };

  const component = renderStep(step);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="flex items-start justify-between gap-4">
        <StepHeader current={step} />
        {authContext && (
          <Button variant="ghost" onClick={handleSignOut} className="mt-1 text-xs text-slate-300">
            サインアウト
          </Button>
        )}
      </div>
      {component}
    </div>
  );
}

function renderStep(step: WizardStep) {
  switch (step) {
    case 'intro':
      return <IntroStep />;
    case 'auth':
      return <AuthStep />;
    case 'ingest':
      return <IngestStep />;
    case 'preview':
      return <PreviewStep />;
    case 'compose':
      return <ComposeStep />;
    case 'review':
      return <ReviewStep />;
    case 'post':
      return <PostStep />;
    case 'complete':
      return <CompleteStep />;
    default:
      return null;
  }
}
