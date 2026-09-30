/**
 * Workspace Synchronization & Optimistic Concurrency Service
 * Fulfills EDT-003, EDT-004, and multi-tab conflict resolution.
 */

import { Profile } from '../types';
import { contentLifecycleService } from './contentLifecycleService';
import { reportRecoverableError } from '../utils/reportError';

interface SyncMessage {
  type: 'PROFILE_UPDATED' | 'PROFILE_PUBLISHED' | 'HEARTBEAT';
  profileId: string;
  version: number;
  updatedAt: number;
  senderTabId: string;
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'conflict' | 'offline';

export interface ConflictState {
  hasConflict: boolean;
  profileId: string;
  localVersion: number;
  remoteVersion: number;
  remoteUpdatedAt: number;
  remoteProfile?: Profile;
}

class WorkspaceSyncService {
  private tabId: string = `tab-${Math.random().toString(36).substring(2, 9)}`;
  private channel: BroadcastChannel | null = null;
  private conflictListeners: Array<(conflict: ConflictState) => void> = [];
  private remoteUpdateListeners: Array<(profileId: string, version: number) => void> = [];
  private readonly boundBroadcastMessage = (event: MessageEvent<SyncMessage>) => this.handleBroadcastMessage(event);
  private readonly boundStorageEvent = (event: StorageEvent) => this.handleStorageEvent(event);

  constructor() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.channel = new BroadcastChannel('lynkflow_workspace_sync');
        this.channel.onmessage = this.boundBroadcastMessage;
      } catch (err) {
        console.warn('BroadcastChannel unavailable, falling back to storage listener', err);
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', this.boundStorageEvent);
    }
  }

  public dispose(): void {
    this.channel?.close();
    this.channel = null;
    if (typeof window !== 'undefined') window.removeEventListener('storage', this.boundStorageEvent);
    this.conflictListeners = [];
    this.remoteUpdateListeners = [];
  }

  public getTabId(): string {
    return this.tabId;
  }

  private handleBroadcastMessage(event: MessageEvent<SyncMessage>) {
    const data = event.data;
    if (!data || data.senderTabId === this.tabId) return;

    if (data.type === 'PROFILE_UPDATED' || data.type === 'PROFILE_PUBLISHED') {
      this.remoteUpdateListeners.forEach(listener => listener(data.profileId, data.version));
    }
  }

  private handleStorageEvent(event: StorageEvent) {
    if (event.key === 'lynkflow_sync_ping' && event.newValue) {
      try {
        const ping: SyncMessage = JSON.parse(event.newValue);
        if (ping.senderTabId !== this.tabId) {
          this.remoteUpdateListeners.forEach(listener => listener(ping.profileId, ping.version));
        }
      } catch (error) {
        reportRecoverableError('workspace sync message parsing failed', error);
      }
    }
  }

  /**
   * Broadcasts that a profile draft or live state was modified by this tab
   */
  public broadcastProfileUpdate(profileId: string, version: number) {
    const message: SyncMessage = {
      type: 'PROFILE_UPDATED',
      profileId,
      version,
      updatedAt: Date.now(),
      senderTabId: this.tabId
    };

    if (this.channel) {
      this.channel.postMessage(message);
    }

    try {
      localStorage.setItem('lynkflow_sync_ping', JSON.stringify(message));
    } catch (error) {
      reportRecoverableError('workspace sync broadcast failed', error);
    }
  }

  /**
   * Subscribes to remote updates from other tabs
   */
  public onRemoteUpdate(listener: (profileId: string, version: number) => void): () => void {
    this.remoteUpdateListeners.push(listener);
    return () => {
      this.remoteUpdateListeners = this.remoteUpdateListeners.filter(l => l !== listener);
    };
  }

  /**
   * Authoritative save simulation with latency, error simulation, and concurrency validation (PUBL-001, PUBL-002)
   */
  public async saveDraftAuthoritative(
    currentDraft: Profile,
    shouldSimulateError = false,
    expectedEtag?: string
  ): Promise<{ success: boolean; updatedProfile?: Profile; error?: string; isConflict?: boolean; etag?: string }> {
    // Artificial network latency (150-300ms) for realistic UX
    await new Promise(res => setTimeout(res, 220));

    if (shouldSimulateError) {
      return {
        success: false,
        error: 'Network connection interrupted while saving changes.'
      };
    }

    try {
      // Use ContentLifecycleService for independent draft persistence with ETag check
      const saveResult = await contentLifecycleService.saveDraftWithConcurrency(
        currentDraft.id,
        currentDraft,
        expectedEtag,
        0
      );

      if (!saveResult.success) {
        return {
          success: false,
          isConflict: saveResult.isConflict,
          error: saveResult.error
        };
      }

      const updated = saveResult.savedDraft || currentDraft;
      this.broadcastProfileUpdate(updated.id, updated.publishedVersion);

      return {
        success: true,
        updatedProfile: updated,
        etag: saveResult.etag
      };
    } catch (e: unknown) {
      return {
        success: false,
        error: e instanceof Error ? e.message : 'Storage error'
      };
    }
  }
}

export const workspaceSyncService = new WorkspaceSyncService();
