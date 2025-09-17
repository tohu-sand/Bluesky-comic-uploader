import { create } from 'zustand';
import type { ComicImage, PostPlan, ThreadResult, OAuthSession, SchedulerEntry } from '@modules/types';
import type { PlanOptions } from '@modules/poster/planner';
import { buildPostPlan } from '@modules/poster/planner';
import type { DPoPKeyPair } from '@modules/auth/dpop';
import type { OAuthConfig } from '@modules/auth/oauth';
import type { AppPasswordSession } from '@modules/auth/appPassword';
import { releaseComicImages } from '@modules/ingest/intake';

export type WizardStep = 'auth' | 'ingest' | 'preview' | 'compose' | 'review' | 'post' | 'complete';

interface UploadStatus {
  status: 'uploading' | 'success' | 'error';
  attempt: number;
  error?: string;
}

interface PostStatus {
  status: 'posting' | 'success' | 'error';
  uri?: string;
  error?: string;
}

interface AppState {
  step: WizardStep;
  session: OAuthSession | null;
  dpopKeyPair: DPoPKeyPair | null;
  appPasswordSession: AppPasswordSession | null;
  oauthConfig: OAuthConfig | null;
  images: ComicImage[];
  postPlan: PostPlan | null;
  firstPostText: string;
  template: string;
  templateEnabled: boolean;
  fallbackBody: string;
  altTemplate: string;
  altTemplateEnabled: boolean;
  threadResult: ThreadResult | null;
  uploadProgress: Record<string, UploadStatus>;
  postProgress: Record<string, PostStatus>;
  schedulerEntries: SchedulerEntry[];
  schedulerEnabled: boolean;
  actions: {
    setStep: (step: WizardStep) => void;
    setSession: (session: OAuthSession | null, keyPair?: DPoPKeyPair | null, config?: OAuthConfig | null) => void;
    setAppPasswordSession: (session: AppPasswordSession | null) => void;
    setImages: (images: ComicImage[]) => void;
    patchImage: (id: string, patch: Partial<ComicImage>) => void;
    markImagesRemoved: (ids: string[], removed: boolean) => void;
    setFirstPostText: (text: string) => void;
    setTemplate: (template: string, enabled: boolean) => void;
    setFallbackBody: (text: string) => void;
    setAltTemplate: (template: string, enabled: boolean) => void;
    rebuildPlan: () => void;
    buildPlanWithOptions: (options: Partial<PlanOptions>) => void;
    setThreadResult: (result: ThreadResult | null) => void;
    resetProgress: () => void;
    updateUploadProgress: (imageId: string, status: UploadStatus) => void;
    updatePostProgress: (postId: string, status: PostStatus) => void;
    setSchedulerEntries: (entries: SchedulerEntry[]) => void;
    setSchedulerEnabled: (value: boolean) => void;
    resetApp: () => void;
  };
}

const defaultAltTemplate = 'Page {i} of {n}';

export const useAppStore = create<AppState>((set, get) => ({
  step: 'auth',
  session: null,
  dpopKeyPair: null,
  appPasswordSession: null,
  oauthConfig: null,
  images: [],
  postPlan: null,
  firstPostText: '',
  template: '{i}/{n}',
  templateEnabled: false,
  fallbackBody: '',
  altTemplate: defaultAltTemplate,
  altTemplateEnabled: true,
  threadResult: null,
  uploadProgress: {},
  postProgress: {},
  schedulerEntries: [],
  schedulerEnabled: false,
  actions: {
    setStep(step) {
      set({ step });
    },
    setSession(session, keyPair = null, config = null) {
      set({
        session,
        dpopKeyPair: keyPair ?? null,
        oauthConfig: config ?? get().oauthConfig,
        appPasswordSession: null
      });
    },
    setAppPasswordSession(session) {
      set({ appPasswordSession: session, session: null, dpopKeyPair: null });
    },
    setImages(images) {
      set({ images });
      const { actions } = get();
      actions.rebuildPlan();
    },
    patchImage(id, patch) {
      set((state) => ({
        images: state.images.map((image) => (image.id === id ? { ...image, ...patch } : image))
      }));
    },
    markImagesRemoved(ids, removed) {
      set((state) => ({
        images: state.images.map((image) => (ids.includes(image.id) ? { ...image, markedForRemoval: removed } : image))
      }));
      const { actions } = get();
      actions.rebuildPlan();
    },
    setFirstPostText(text) {
      set({ firstPostText: text });
      const { actions } = get();
      actions.rebuildPlan();
    },
    setTemplate(template, enabled) {
      set({ template, templateEnabled: enabled });
      const { actions } = get();
      actions.rebuildPlan();
    },
    setFallbackBody(text) {
      set({ fallbackBody: text });
      const { actions } = get();
      actions.rebuildPlan();
    },
    setAltTemplate(template, enabled) {
      set({ altTemplate: template, altTemplateEnabled: enabled });
    },
    rebuildPlan() {
      const state = get();
      const { images, firstPostText, template, templateEnabled, fallbackBody } = state;
      if (images.length === 0) {
        set({ postPlan: null });
        return;
      }
      const plan = buildPostPlan(images, {
        firstPostText,
        template,
        enableTemplate: templateEnabled,
        fallbackText: fallbackBody
      });
      set({ postPlan: plan });
    },
    buildPlanWithOptions(options) {
      const state = get();
      const plan = buildPostPlan(state.images, {
        firstPostText: options.firstPostText ?? state.firstPostText,
        template: options.template ?? state.template,
        enableTemplate: options.enableTemplate ?? state.templateEnabled,
        fallbackText: options.fallbackText ?? state.fallbackBody
      });
      set({ postPlan: plan });
    },
    setThreadResult(result) {
      set({ threadResult: result });
    },
    resetProgress() {
      set({ uploadProgress: {}, postProgress: {} });
    },
    updateUploadProgress(imageId, status) {
      set((state) => ({
        uploadProgress: {
          ...state.uploadProgress,
          [imageId]: status
        }
      }));
    },
    updatePostProgress(postId, status) {
      set((state) => ({
        postProgress: {
          ...state.postProgress,
          [postId]: status
        }
      }));
    },
    setSchedulerEntries(entries) {
      set({ schedulerEntries: entries });
    },
    setSchedulerEnabled(value) {
      set({ schedulerEnabled: value });
    },
    resetApp() {
      set((state) => {
        if (state.images.length > 0) {
          releaseComicImages(state.images);
        }
        return {
          step: 'auth',
          images: [],
          postPlan: null,
          threadResult: null,
          uploadProgress: {},
          postProgress: {},
          firstPostText: '',
          fallbackBody: '',
          template: '{i}/{n}',
          templateEnabled: false,
          altTemplate: defaultAltTemplate,
          altTemplateEnabled: true,
          session: null,
          dpopKeyPair: null,
          appPasswordSession: null
        };
      });
    }
  }
}));
