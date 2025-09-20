import { create } from 'zustand';
import type { ComicImage, PostPlan, ThreadResult, OAuthSession, SchedulerEntry } from '@modules/types';
import type { CompressionMode } from '@modules/ingest/compression';
import type { PlanOptions } from '@modules/poster/planner';
import { buildPostPlan } from '@modules/poster/planner';
import type { DPoPKeyPair } from '@modules/auth/dpop';
import type { OAuthConfig } from '@modules/auth/oauth';
import type { AppPasswordSession } from '@modules/auth/appPassword';
import { releaseComicImages } from '@modules/ingest/intake';
import { updateAltTexts } from '@modules/editor/altText';

export type WizardStep = 'intro' | 'auth' | 'ingest' | 'preview' | 'compose' | 'review' | 'post' | 'complete';

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
  firstPostSingleImage: boolean;
  template: string;
  templateEnabled: boolean;
  fallbackBody: string;
  altTemplate: string;
  altTemplateEnabled: boolean;
  compressionMode: CompressionMode;
  threadResult: ThreadResult | null;
  uploadProgress: Record<string, UploadStatus>;
  postProgress: Record<string, PostStatus>;
  schedulerEntries: SchedulerEntry[];
  schedulerEnabled: boolean;
  scheduledAt: string | null;
  actions: {
    setStep: (step: WizardStep) => void;
    setSession: (session: OAuthSession | null, keyPair?: DPoPKeyPair | null, config?: OAuthConfig | null) => void;
    setAppPasswordSession: (session: AppPasswordSession | null) => void;
    setImages: (images: ComicImage[]) => void;
    markImagesRemoved: (ids: string[], removed: boolean) => void;
    setFirstPostText: (text: string) => void;
    setFirstPostSingleImage: (value: boolean) => void;
    setTemplate: (template: string, enabled: boolean) => void;
    setFallbackBody: (text: string) => void;
    setAltTemplate: (template: string, enabled?: boolean) => void;
    setCompressionMode: (mode: CompressionMode) => void;
    rebuildPlan: () => void;
    buildPlanWithOptions: (options: Partial<PlanOptions>) => void;
    setThreadResult: (result: ThreadResult | null) => void;
    resetProgress: () => void;
    updateUploadProgress: (imageId: string, status: UploadStatus) => void;
    updatePostProgress: (postId: string, status: PostStatus) => void;
    setSchedulerEntries: (entries: SchedulerEntry[]) => void;
    setSchedulerEnabled: (value: boolean) => void;
    setScheduledAt: (value: string | null) => void;
    resetApp: () => void;
  };
}

const defaultAltTemplate = 'Page {i} of {n}';
const fallbackAltTemplate = 'Page {i}';

export const useAppStore = create<AppState>((set, get) => ({
  step: 'intro',
  session: null,
  dpopKeyPair: null,
  appPasswordSession: null,
  oauthConfig: null,
  images: [],
  postPlan: null,
  firstPostText: '',
  firstPostSingleImage: false,
  template: '({i}/{n})',
  templateEnabled: true,
  fallbackBody: '',
  altTemplate: defaultAltTemplate,
  altTemplateEnabled: true,
  compressionMode: 'balanced',
  threadResult: null,
  uploadProgress: {},
  postProgress: {},
  schedulerEntries: [],
  schedulerEnabled: false,
  scheduledAt: null,
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
      set((state) => {
        const nextImages = images.map((image) => ({ ...image }));
        const templateToApply = state.altTemplateEnabled ? state.altTemplate : fallbackAltTemplate;
        updateAltTexts(nextImages, templateToApply);
        return { images: nextImages };
      });
      const { actions } = get();
      actions.rebuildPlan();
    },
    markImagesRemoved(ids, removed) {
      set((state) => {
        const nextImages = state.images.map((image) => {
          const shouldUpdateRemoval = ids.includes(image.id);
          if (shouldUpdateRemoval) {
            return { ...image, markedForRemoval: removed };
          }
          return { ...image };
        });
        const templateToApply = state.altTemplateEnabled ? state.altTemplate : fallbackAltTemplate;
        updateAltTexts(nextImages, templateToApply);
        return { images: nextImages };
      });
      const { actions } = get();
      actions.rebuildPlan();
    },
    setFirstPostText(text) {
      set({ firstPostText: text });
      const { actions } = get();
      actions.rebuildPlan();
    },
    setFirstPostSingleImage(value) {
      set({ firstPostSingleImage: value });
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
      set((state) => {
        const nextEnabled = enabled ?? state.altTemplateEnabled;
        if (state.images.length === 0) {
          return {
            altTemplate: template,
            altTemplateEnabled: nextEnabled
          };
        }
        const nextImages = state.images.map((image) => ({ ...image }));
        const templateToApply = nextEnabled ? template : fallbackAltTemplate;
        updateAltTexts(nextImages, templateToApply);
        return {
          images: nextImages,
          altTemplate: template,
          altTemplateEnabled: nextEnabled
        };
      });
      const { actions } = get();
      actions.rebuildPlan();
    },
    setCompressionMode(mode) {
      set({ compressionMode: mode });
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
        fallbackText: fallbackBody,
        firstPostSingleImage: state.firstPostSingleImage
      });
      set({ postPlan: plan });
    },
    buildPlanWithOptions(options) {
      const state = get();
      const plan = buildPostPlan(state.images, {
        firstPostText: options.firstPostText ?? state.firstPostText,
        template: options.template ?? state.template,
        enableTemplate: options.enableTemplate ?? state.templateEnabled,
        fallbackText: options.fallbackText ?? state.fallbackBody,
        firstPostSingleImage: options.firstPostSingleImage ?? state.firstPostSingleImage
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
      set((state) => ({
        schedulerEnabled: value,
        scheduledAt: value ? state.scheduledAt : null
      }));
    },
    setScheduledAt(value) {
      set({ scheduledAt: value });
    },
    resetApp() {
      set((state) => {
        if (state.images.length > 0) {
          releaseComicImages(state.images);
        }
        return {
          step: 'intro',
          images: [],
          postPlan: null,
          threadResult: null,
          uploadProgress: {},
          postProgress: {},
          firstPostText: '',
          firstPostSingleImage: false,
          fallbackBody: '',
          template: '({i}/{n})',
          templateEnabled: true,
          altTemplate: defaultAltTemplate,
          altTemplateEnabled: true,
          compressionMode: 'balanced',
          session: null,
          dpopKeyPair: null,
          appPasswordSession: null,
          schedulerEntries: [],
          schedulerEnabled: false,
          scheduledAt: null
        };
      });
    }
  }
}));
