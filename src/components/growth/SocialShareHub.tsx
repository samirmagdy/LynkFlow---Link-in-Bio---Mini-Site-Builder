import React, { useEffect, useMemo, useState } from 'react';
import { AtSign, CalendarDays, Check, ChevronLeft, ChevronRight, Clipboard, ExternalLink, Facebook, Instagram, Linkedin, Loader2, Mail, MessageCircle, Music2, Send, Share2, Twitter, Upload, Youtube } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { uploadBlockAsset } from '../../services/backgroundAssetService';
import { cancelSocialPublication, completeSocialShare, loadSocialConnections, loadSocialPublications, loadSocialShareEvents, publishFacebookPost, publishInstagramPost, publishLinkedInPost, publishTikTokPost, publishXPost, publishYouTubePost, publishThreadsPost, recordSocialShare, scheduleFacebookPost, scheduleInstagramPost, scheduleLinkedInPost, scheduleTikTokPost, scheduleXPost, scheduleYouTubePost, scheduleThreadsPost, syncSocialFollowers, ShareProvider, SocialConnection, SocialPublication, SocialFollowerSync, startFacebookOAuth, startInstagramOAuth, startLinkedInOAuth, startTikTokOAuth, startXOAuth, startYouTubeOAuth, startThreadsOAuth, SocialShareEvent } from '../../services/socialShareService';

const PROVIDERS: Array<{ id: ShareProvider; label: string; icon: React.ReactNode; hint: string }> = [
  { id: 'x', label: 'X', icon: <Twitter className="h-4 w-4" />, hint: 'Post with a pre-filled message' },
  { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="h-4 w-4" />, hint: 'Share your page with your network' },
  { id: 'tiktok', label: 'TikTok', icon: <Music2 className="h-4 w-4" />, hint: 'Publish a video to your profile' },
  { id: 'instagram', label: 'Instagram', icon: <Instagram className="h-4 w-4" />, hint: 'Publish an image or video to your profile' },
  { id: 'youtube', label: 'YouTube', icon: <Youtube className="h-4 w-4" />, hint: 'Open YouTube Studio to upload a video' },
  { id: 'threads', label: 'Threads', icon: <AtSign className="h-4 w-4" />, hint: 'Open the Threads composer' },
  { id: 'facebook', label: 'Facebook', icon: <Facebook className="h-4 w-4" />, hint: 'Open the share composer' },
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="h-4 w-4" />, hint: 'Send it to a conversation' },
  { id: 'telegram', label: 'Telegram', icon: <Send className="h-4 w-4" />, hint: 'Share to a chat or channel' },
  { id: 'email', label: 'Email', icon: <Mail className="h-4 w-4" />, hint: 'Open a new email draft' },
];
const BROADCAST_PROVIDERS = PROVIDERS.filter(provider => provider.id !== 'email');

type BroadcastResult = {
  provider: 'linkedin' | 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'threads' | 'x';
  status: 'published' | 'processing' | 'scheduled' | 'skipped' | 'failed';
  message: string;
};

function defaultScheduleTime(): string {
  const value = new Date(Date.now() + 60 * 60_000);
  value.setSeconds(0, 0);
  const offset = value.getTimezoneOffset();
  return new Date(value.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function shareUrl(provider: ShareProvider, content: string, targetUrl: string): string {
  const text = encodeURIComponent(content);
  const url = encodeURIComponent(targetUrl);
  switch (provider) {
    case 'x': return `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    case 'linkedin': return `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    case 'facebook': return `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    case 'whatsapp': return `https://wa.me/?text=${encodeURIComponent(`${content}\n${targetUrl}`)}`;
    case 'telegram': return `https://t.me/share/url?url=${url}&text=${text}`;
    case 'email': return `mailto:?subject=${encodeURIComponent('Take a look at this page')}&body=${encodeURIComponent(`${content}\n\n${targetUrl}`)}`;
    case 'tiktok': return 'https://www.tiktok.com/upload?lang=en';
    case 'instagram': return 'https://www.instagram.com/';
    case 'youtube': return 'https://studio.youtube.com/channel/UC/videos/upload';
    case 'threads': return 'https://www.threads.net/';
  }
}

export const SocialShareHub: React.FC = () => {
  const { activeProfile } = useApp();
  const [content, setContent] = useState(`I just published a new page — take a look at @${activeProfile.username}.`);
  const [targetUrl, setTargetUrl] = useState(() => `${window.location.origin}/@${activeProfile.username}`);
  const [events, setEvents] = useState<SocialShareEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyProvider, setBusyProvider] = useState<ShareProvider | 'all' | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkedinConnection, setLinkedinConnection] = useState<SocialConnection | null>(null);
  const [linkedinPublishing, setLinkedinPublishing] = useState(false);
  const [tiktokConnection, setTiktokConnection] = useState<SocialConnection | null>(null);
  const [tiktokPublishing, setTiktokPublishing] = useState(false);
  const [instagramConnection, setInstagramConnection] = useState<SocialConnection | null>(null);
  const [instagramPublishing, setInstagramPublishing] = useState(false);
  const [facebookConnection, setFacebookConnection] = useState<SocialConnection | null>(null);
  const [facebookPublishing, setFacebookPublishing] = useState(false);
  const [xConnection, setXConnection] = useState<SocialConnection | null>(null);
  const [xPublishing, setXPublishing] = useState(false);
  const [youtubeConnection, setYouTubeConnection] = useState<SocialConnection | null>(null);
  const [threadsConnection, setThreadsConnection] = useState<SocialConnection | null>(null);
  const [youtubePublishing, setYouTubePublishing] = useState(false);
  const [instagramMediaType, setInstagramMediaType] = useState<'image' | 'video'>('image');
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleTime);
  const [scheduling, setScheduling] = useState(false);
  const [publications, setPublications] = useState<SocialPublication[]>([]);
  const [calendarCursor, setCalendarCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [broadcastResults, setBroadcastResults] = useState<BroadcastResult[]>([]);
  const [captionOverrides, setCaptionOverrides] = useState<Partial<Record<'linkedin' | 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'threads' | 'x', string>>>({});
  const [followerSync, setFollowerSync] = useState<SocialFollowerSync | null>(null);
  const [syncingFollowers, setSyncingFollowers] = useState(false);

  useEffect(() => {
    setContent(`I just published a new page — take a look at @${activeProfile.username}.`);
    setTargetUrl(`${window.location.origin}/@${activeProfile.username}`);
    let cancelled = false;
    setLoading(true);
    void Promise.all([loadSocialShareEvents(activeProfile.id), loadSocialConnections(), loadSocialPublications(activeProfile.id)]).then(([shareEvents, connections, scheduledPosts]) => { if (!cancelled) { setEvents(shareEvents); setLinkedinConnection(connections.find(connection => connection.provider === 'linkedin' && connection.status === 'active') || null); setTiktokConnection(connections.find(connection => connection.provider === 'tiktok' && connection.status === 'active') || null); setInstagramConnection(connections.find(connection => connection.provider === 'instagram' && connection.status === 'active') || null); setFacebookConnection(connections.find(connection => connection.provider === 'facebook' && connection.status === 'active') || null); setXConnection(connections.find(connection => connection.provider === 'x' && connection.status === 'active') || null); setYouTubeConnection(connections.find(connection => connection.provider === 'youtube' && connection.status === 'active') || null); setThreadsConnection(connections.find(connection => connection.provider === 'threads' && connection.status === 'active') || null); setPublications(scheduledPosts); } }).catch(reason => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load share activity.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeProfile.id, activeProfile.username]);

  const valid = useMemo(() => content.trim().length > 0 && /^https?:\/\//i.test(targetUrl.trim()), [content, targetUrl]);
  const captionFor = (provider: 'linkedin' | 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'threads' | 'x') => (captionOverrides[provider] || content).trim();

  const syncFollowers = async () => {
    setSyncingFollowers(true); setError(null);
    try { setFollowerSync(await syncSocialFollowers(activeProfile.id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to sync follower totals.'); }
    finally { setSyncingFollowers(false); }
  };

  const uploadSocialMedia = async (file: File) => {
    setMediaUploading(true);
    setMediaUploadError(null);
    try {
      const uploaded = await uploadBlockAsset(file, activeProfile.id);
      setMediaUrl(uploaded.url);
      if (file.type.startsWith('video/')) setInstagramMediaType('video');
      else if (file.type.startsWith('image/')) setInstagramMediaType('image');
    } catch (reason) {
      setMediaUploadError(reason instanceof Error ? reason.message : 'Media upload failed.');
    } finally {
      setMediaUploading(false);
    }
  };

  const openProvider = async (provider: ShareProvider) => {
    if (!valid) { setError('Add a message and a valid page URL before sharing.'); return; }
    if (provider === 'linkedin' && !linkedinConnection) { startLinkedInOAuth(); return; }
    if (provider === 'linkedin' && linkedinConnection) {
      setLinkedinPublishing(true); setError(null);
      try {
        const event = await recordSocialShare(activeProfile.id, provider, content.trim(), targetUrl.trim());
        setEvents(previous => [event, ...previous].slice(0, 20));
        await publishLinkedInPost(content.trim(), targetUrl.trim(), activeProfile.id);
        await completeSocialShare(event.id, 'completed');
        setEvents(previous => previous.map(item => item.id === event.id ? { ...item, status: 'completed' } : item));
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to publish to LinkedIn.'); }
      finally { setLinkedinPublishing(false); }
      return;
    }
    if (provider === 'tiktok' && !tiktokConnection) { startTikTokOAuth(); return; }
    if (provider === 'tiktok' && tiktokConnection) {
      if (!mediaUrl.trim()) { setError('Upload a video or add a public HTTPS URL before publishing to TikTok.'); return; }
      setTiktokPublishing(true); setError(null);
      try {
        const event = await recordSocialShare(activeProfile.id, provider, content.trim(), mediaUrl.trim());
        setEvents(previous => [event, ...previous].slice(0, 20));
        await publishTikTokPost(content.trim(), mediaUrl.trim(), activeProfile.id, event.id);
        setError('TikTok accepted the video. It is processing; the final status will be updated by TikTok.');
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to publish to TikTok.'); }
      finally { setTiktokPublishing(false); }
      return;
    }
    if (provider === 'instagram' && !instagramConnection) { startInstagramOAuth(); return; }
    if (provider === 'instagram' && instagramConnection) {
      if (!mediaUrl.trim()) { setError('Upload an image or video, or add a public HTTPS URL before publishing to Instagram.'); return; }
      setInstagramPublishing(true); setError(null);
      try {
        const event = await recordSocialShare(activeProfile.id, provider, content.trim(), mediaUrl.trim());
        setEvents(previous => [event, ...previous].slice(0, 20));
        await publishInstagramPost(content.trim(), mediaUrl.trim(), instagramMediaType, activeProfile.id, event.id);
        setEvents(previous => previous.map(item => item.id === event.id ? { ...item, status: 'completed' } : item));
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to publish to Instagram.'); }
      finally { setInstagramPublishing(false); }
      return;
    }
    if (provider === 'facebook' && !facebookConnection) { startFacebookOAuth(); return; }
    if (provider === 'facebook' && facebookConnection) {
      setFacebookPublishing(true); setError(null);
      try {
        const event = await recordSocialShare(activeProfile.id, provider, content.trim(), targetUrl.trim());
        setEvents(previous => [event, ...previous].slice(0, 20));
        await publishFacebookPost(content.trim(), targetUrl.trim(), activeProfile.id, event.id);
        setEvents(previous => previous.map(item => item.id === event.id ? { ...item, status: 'completed' } : item));
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to publish to Facebook.'); }
      finally { setFacebookPublishing(false); }
      return;
    }
    if (provider === 'x' && !xConnection) { startXOAuth(); return; }
    if (provider === 'x' && xConnection) {
      setXPublishing(true); setError(null);
      try {
        const event = await recordSocialShare(activeProfile.id, provider, content.trim(), targetUrl.trim());
        setEvents(previous => [event, ...previous].slice(0, 20));
        await publishXPost(content.trim(), targetUrl.trim(), activeProfile.id, event.id);
        setEvents(previous => previous.map(item => item.id === event.id ? { ...item, status: 'completed' } : item));
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to publish to X.'); }
      finally { setXPublishing(false); }
      return;
    }
    if (provider === 'youtube' && !youtubeConnection) { startYouTubeOAuth(); return; }
    if (provider === 'youtube' && youtubeConnection) {
      if (!mediaUrl.trim()) { setError('Upload a video or add a public HTTPS URL before publishing to YouTube.'); return; }
      setYouTubePublishing(true); setError(null);
      try {
        const event = await recordSocialShare(activeProfile.id, provider, content.trim(), mediaUrl.trim());
        setEvents(previous => [event, ...previous].slice(0, 20));
        await publishYouTubePost(content.trim(), mediaUrl.trim(), activeProfile.id, event.id);
        await completeSocialShare(event.id, 'completed');
        setEvents(previous => previous.map(item => item.id === event.id ? { ...item, status: 'completed' } : item));
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to publish to YouTube.'); }
      finally { setYouTubePublishing(false); }
      return;
    }
    if (provider === 'threads' && !threadsConnection) { startThreadsOAuth(); return; }
    if (provider === 'threads' && threadsConnection) {
      setBusyProvider('threads'); setError(null);
      try {
        const event = await recordSocialShare(activeProfile.id, provider, content.trim(), targetUrl.trim());
        setEvents(previous => [event, ...previous].slice(0, 20));
        await publishThreadsPost(content.trim(), targetUrl.trim(), activeProfile.id, event.id);
        await completeSocialShare(event.id, 'completed');
        setEvents(previous => previous.map(item => item.id === event.id ? { ...item, status: 'completed' } : item));
      } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to publish to Threads.'); }
      finally { setBusyProvider(null); }
      return;
    }
    setBusyProvider(provider); setError(null);
    try {
      const event = await recordSocialShare(activeProfile.id, provider, content.trim(), targetUrl.trim());
      setEvents(previous => [event, ...previous].slice(0, 20));
      const popup = window.open(shareUrl(provider, content.trim(), targetUrl.trim()), '_blank', 'noopener,noreferrer');
      await completeSocialShare(event.id, popup ? 'completed' : 'failed');
      setEvents(previous => previous.map(item => item.id === event.id ? { ...item, status: popup ? 'completed' : 'failed' } : item));
      if (!popup) setError('Your browser blocked the provider window. Allow pop-ups and try again.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to start this share.'); }
    finally { setBusyProvider(null); }
  };

  const openAllProviders = async () => {
    if (!valid) { setError('Add a message and a valid page URL before sharing.'); return; }
    setBusyProvider('all'); setError(null);
    let blocked = false;
    try {
      for (const provider of BROADCAST_PROVIDERS) {
        const event = await recordSocialShare(activeProfile.id, provider.id, content.trim(), targetUrl.trim());
        setEvents(previous => [event, ...previous].slice(0, 20));
        const popup = window.open(shareUrl(provider.id, content.trim(), targetUrl.trim()), '_blank', 'noopener,noreferrer');
        blocked ||= !popup;
        await completeSocialShare(event.id, popup ? 'completed' : 'failed');
        setEvents(previous => previous.map(item => item.id === event.id ? { ...item, status: popup ? 'completed' : 'failed' } : item));
      }
      if (blocked) setError('Some provider windows were blocked. Allow pop-ups and retry the failed handoffs.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to open all share composers.'); }
    finally { setBusyProvider(null); }
  };

  const publishToConnected = async () => {
    if (!valid) { setError('Add a message and a valid page URL before publishing.'); return; }
    const connected = [linkedinConnection, tiktokConnection, instagramConnection, facebookConnection, youtubeConnection, threadsConnection, xConnection].filter(Boolean);
    if (connected.length === 0) {
      setError('Connect at least one publishing account before using Publish to connected.');
      return;
    }
    if ((tiktokConnection || instagramConnection || youtubeConnection) && !mediaUrl.trim()) {
      setError('Upload media or add a public HTTPS media URL to publish to TikTok, Instagram, or YouTube.');
      return;
    }
    const captionLimits: Record<'linkedin' | 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'threads' | 'x', number> = { linkedin: 3000, tiktok: 2200, instagram: 2200, facebook: 63206, youtube: 5000, threads: 500, x: 280 };
    const invalidCaption = (Object.keys(captionLimits) as Array<keyof typeof captionLimits>).find(provider => captionFor(provider).length > captionLimits[provider]);
    if (invalidCaption) {
      setError(`${invalidCaption} caption is too long for that platform (${captionLimits[invalidCaption]} characters maximum).`);
      return;
    }

    setBusyProvider('all');
    setError(null);
    setBroadcastResults([]);
    const results: BroadcastResult[] = [];
    const publish = async (provider: 'linkedin' | 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'threads' | 'x') => {
      const providerContent = captionFor(provider);
      const event = await recordSocialShare(activeProfile.id, provider, providerContent, provider === 'linkedin' || provider === 'facebook' || provider === 'threads' || provider === 'x' ? targetUrl.trim() : mediaUrl.trim());
      setEvents(previous => [event, ...previous].slice(0, 20));
      try {
        if (provider === 'linkedin') {
          await publishLinkedInPost(providerContent, targetUrl.trim(), activeProfile.id);
          await completeSocialShare(event.id, 'completed');
          results.push({ provider, status: 'published', message: 'Published and confirmed by LinkedIn.' });
        } else if (provider === 'tiktok') {
          await publishTikTokPost(providerContent, mediaUrl.trim(), activeProfile.id, event.id);
          results.push({ provider, status: 'processing', message: 'Accepted by TikTok; processing continues asynchronously.' });
        } else if (provider === 'instagram') {
          await publishInstagramPost(providerContent, mediaUrl.trim(), instagramMediaType, activeProfile.id, event.id);
          await completeSocialShare(event.id, 'completed');
          results.push({ provider, status: 'published', message: 'Published and confirmed by Instagram.' });
        } else if (provider === 'facebook') {
          await publishFacebookPost(providerContent, targetUrl.trim(), activeProfile.id, event.id);
          await completeSocialShare(event.id, 'completed');
          results.push({ provider, status: 'published', message: 'Published and confirmed by Facebook.' });
        } else if (provider === 'youtube') {
          await publishYouTubePost(providerContent, mediaUrl.trim(), activeProfile.id, event.id);
          await completeSocialShare(event.id, 'completed');
          results.push({ provider, status: 'published', message: 'Published and confirmed by YouTube.' });
        } else if (provider === 'threads') {
          await publishThreadsPost(providerContent, targetUrl.trim(), activeProfile.id, event.id);
          await completeSocialShare(event.id, 'completed');
          results.push({ provider, status: 'published', message: 'Published and confirmed by Threads.' });
        } else {
          await publishXPost(providerContent, targetUrl.trim(), activeProfile.id, event.id);
          await completeSocialShare(event.id, 'completed');
          results.push({ provider, status: 'published', message: 'Published and confirmed by X.' });
        }
      } catch (reason) {
        await completeSocialShare(event.id, 'failed').catch(() => undefined);
        results.push({ provider, status: 'failed', message: reason instanceof Error ? reason.message : 'Provider rejected the post.' });
      }
    };

    await Promise.all([
      linkedinConnection ? publish('linkedin') : Promise.resolve(results.push({ provider: 'linkedin', status: 'skipped', message: 'Connect LinkedIn to publish there.' })),
      tiktokConnection ? publish('tiktok') : Promise.resolve(results.push({ provider: 'tiktok', status: 'skipped', message: 'Connect TikTok to publish there.' })),
      instagramConnection ? publish('instagram') : Promise.resolve(results.push({ provider: 'instagram', status: 'skipped', message: 'Connect Instagram to publish there.' })),
      facebookConnection ? publish('facebook') : Promise.resolve(results.push({ provider: 'facebook', status: 'skipped', message: 'Connect a Facebook Page to publish there.' })),
      youtubeConnection ? publish('youtube') : Promise.resolve(results.push({ provider: 'youtube', status: 'skipped', message: 'Connect YouTube to publish there.' })),
      threadsConnection ? publish('threads') : Promise.resolve(results.push({ provider: 'threads', status: 'skipped', message: 'Connect Threads to publish there.' })),
      xConnection ? publish('x') : Promise.resolve(results.push({ provider: 'x', status: 'skipped', message: 'Connect X to publish there.' }))
    ]);
    setBroadcastResults(results);
    setEvents(previous => previous.map(item => {
      const result = results.find(candidate => candidate.provider === item.provider);
      return result?.status === 'failed' && item.status === 'initiated' ? { ...item, status: 'failed' } : item;
    }));
    if (results.some(result => result.status === 'failed')) setError('One or more providers rejected the post. Review the delivery results below and retry the failed provider.');
    setBusyProvider(null);
  };

  const scheduleToConnected = async () => {
    if (!valid) { setError('Add a message and a valid page URL before scheduling.'); return; }
    const connected = [linkedinConnection, tiktokConnection, instagramConnection, facebookConnection, youtubeConnection, threadsConnection, xConnection].filter(Boolean);
    if (connected.length === 0) { setError('Connect at least one publishing account before scheduling.'); return; }
    if ((tiktokConnection || instagramConnection || youtubeConnection) && !mediaUrl.trim()) { setError('Upload media or add a public HTTPS media URL to schedule TikTok, Instagram, or YouTube.'); return; }
    const captionLimits: Record<'linkedin' | 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'threads' | 'x', number> = { linkedin: 3000, tiktok: 2200, instagram: 2200, facebook: 63206, youtube: 5000, threads: 500, x: 280 };
    const invalidCaption = (Object.keys(captionLimits) as Array<keyof typeof captionLimits>).find(provider => captionFor(provider).length > captionLimits[provider]);
    if (invalidCaption) { setError(`${invalidCaption} caption is too long for that platform (${captionLimits[invalidCaption]} characters maximum).`); return; }
    setScheduling(true); setError(null); setBroadcastResults([]);
    const scheduledIso = new Date(scheduledAt).toISOString();
    const results: BroadcastResult[] = [];
    const schedule = async (provider: 'linkedin' | 'tiktok' | 'instagram' | 'facebook' | 'youtube' | 'threads' | 'x') => {
      const providerContent = captionFor(provider);
      try {
        let publication: SocialPublication;
        if (provider === 'linkedin') publication = await scheduleLinkedInPost(providerContent, targetUrl.trim(), activeProfile.id, scheduledIso);
        else if (provider === 'tiktok') publication = await scheduleTikTokPost(providerContent, mediaUrl.trim(), activeProfile.id, scheduledIso);
        else if (provider === 'instagram') publication = await scheduleInstagramPost(providerContent, mediaUrl.trim(), instagramMediaType, activeProfile.id, scheduledIso);
        else if (provider === 'facebook') publication = await scheduleFacebookPost(providerContent, targetUrl.trim(), activeProfile.id, scheduledIso);
        else if (provider === 'youtube') publication = await scheduleYouTubePost(providerContent, mediaUrl.trim(), activeProfile.id, scheduledIso);
        else if (provider === 'threads') publication = await scheduleThreadsPost(providerContent, targetUrl.trim(), activeProfile.id, scheduledIso);
        else publication = await scheduleXPost(providerContent, targetUrl.trim(), activeProfile.id, scheduledIso);
        setPublications(previous => [publication, ...previous].slice(0, 50));
        results.push({ provider, status: 'scheduled', message: `Scheduled for ${new Date(scheduledIso).toLocaleString()}.` });
      } catch (reason) { results.push({ provider, status: 'failed', message: reason instanceof Error ? reason.message : 'Provider rejected the schedule.' }); }
    };
    await Promise.all([
      linkedinConnection ? schedule('linkedin') : Promise.resolve(results.push({ provider: 'linkedin', status: 'skipped', message: 'Connect LinkedIn to schedule there.' })),
      tiktokConnection ? schedule('tiktok') : Promise.resolve(results.push({ provider: 'tiktok', status: 'skipped', message: 'Connect TikTok to schedule there.' })),
      instagramConnection ? schedule('instagram') : Promise.resolve(results.push({ provider: 'instagram', status: 'skipped', message: 'Connect Instagram to schedule there.' })),
      facebookConnection ? schedule('facebook') : Promise.resolve(results.push({ provider: 'facebook', status: 'skipped', message: 'Connect a Facebook Page to schedule there.' })),
      youtubeConnection ? schedule('youtube') : Promise.resolve(results.push({ provider: 'youtube', status: 'skipped', message: 'Connect YouTube to schedule there.' })),
      threadsConnection ? schedule('threads') : Promise.resolve(results.push({ provider: 'threads', status: 'skipped', message: 'Connect Threads to schedule there.' })),
      xConnection ? schedule('x') : Promise.resolve(results.push({ provider: 'x', status: 'skipped', message: 'Connect X to schedule there.' }))
    ]);
    setBroadcastResults(results);
    if (results.some(result => result.status === 'failed')) setError('Some channels could not be scheduled. Review the delivery results and retry only those channels.');
    setScheduling(false);
  };

  const schedulePost = async () => {
    if (!valid) { setError('Add a message and a valid page URL before scheduling.'); return; }
    if (!linkedinConnection) { startLinkedInOAuth(); return; }
    setScheduling(true); setError(null);
    try {
      const publication = await scheduleLinkedInPost(content.trim(), targetUrl.trim(), activeProfile.id, new Date(scheduledAt).toISOString());
      setPublications(previous => [publication, ...previous].slice(0, 50));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to schedule LinkedIn post.'); }
    finally { setScheduling(false); }
  };

  const scheduleTikTok = async () => {
    if (!valid || !mediaUrl.trim()) { setError('Add a message and page URL, then upload a video or provide a public HTTPS URL before scheduling TikTok.'); return; }
    if (!tiktokConnection) { startTikTokOAuth(); return; }
    setScheduling(true); setError(null);
    try {
      const publication = await scheduleTikTokPost(content.trim(), mediaUrl.trim(), activeProfile.id, new Date(scheduledAt).toISOString());
      setPublications(previous => [publication, ...previous].slice(0, 50));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to schedule TikTok post.'); }
    finally { setScheduling(false); }
  };

  const scheduleInstagram = async () => {
    if (!valid || !mediaUrl.trim()) { setError('Add a message and page URL, then upload media or provide a public HTTPS URL before scheduling Instagram.'); return; }
    if (!instagramConnection) { startInstagramOAuth(); return; }
    setScheduling(true); setError(null);
    try { const publication = await scheduleInstagramPost(content.trim(), mediaUrl.trim(), instagramMediaType, activeProfile.id, new Date(scheduledAt).toISOString()); setPublications(previous => [publication, ...previous].slice(0, 50)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to schedule Instagram post.'); }
    finally { setScheduling(false); }
  };

  const scheduleFacebook = async () => {
    if (!valid) { setError('Add a message and a valid page URL before scheduling Facebook.'); return; }
    if (!facebookConnection) { startFacebookOAuth(); return; }
    setScheduling(true); setError(null);
    try { const publication = await scheduleFacebookPost(content.trim(), targetUrl.trim(), activeProfile.id, new Date(scheduledAt).toISOString()); setPublications(previous => [publication, ...previous].slice(0, 50)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to schedule Facebook post.'); }
    finally { setScheduling(false); }
  };

  const scheduleX = async () => {
    if (!valid) { setError('Add a message and a valid page URL before scheduling X.'); return; }
    if (!xConnection) { startXOAuth(); return; }
    setScheduling(true); setError(null);
    try { const publication = await scheduleXPost(content.trim(), targetUrl.trim(), activeProfile.id, new Date(scheduledAt).toISOString()); setPublications(previous => [publication, ...previous].slice(0, 50)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to schedule X post.'); }
    finally { setScheduling(false); }
  };

  const scheduleThreads = async () => {
    if (!valid) { setError('Add a message and a valid page URL before scheduling Threads.'); return; }
    if (!threadsConnection) { startThreadsOAuth(); return; }
    setScheduling(true); setError(null);
    try { const publication = await scheduleThreadsPost(content.trim(), targetUrl.trim(), activeProfile.id, new Date(scheduledAt).toISOString()); setPublications(previous => [publication, ...previous].slice(0, 50)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to schedule Threads post.'); }
    finally { setScheduling(false); }
  };

  const scheduleYouTube = async () => {
    if (!valid || !mediaUrl.trim()) { setError('Add a message and page URL, then upload a video or provide a public HTTPS URL before scheduling YouTube.'); return; }
    if (!youtubeConnection) { startYouTubeOAuth(); return; }
    setScheduling(true); setError(null);
    try { const publication = await scheduleYouTubePost(content.trim(), mediaUrl.trim(), activeProfile.id, new Date(scheduledAt).toISOString()); setPublications(previous => [publication, ...previous].slice(0, 50)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to schedule YouTube video.'); }
    finally { setScheduling(false); }
  };

  const cancelScheduledPost = async (publication: SocialPublication) => {
    setScheduling(true); setError(null);
    try { await cancelSocialPublication(publication.id); setPublications(previous => previous.map(item => item.id === publication.id ? { ...item, status: 'cancelled' } : item)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to cancel scheduled post.'); }
    finally { setScheduling(false); }
  };

  const retryShare = async (event: SocialShareEvent) => {
    if (busyProvider !== null) return;
    setBusyProvider(event.provider); setError(null);
    try {
      const popup = window.open(shareUrl(event.provider, event.content, event.target_url), '_blank', 'noopener,noreferrer');
      await completeSocialShare(event.id, popup ? 'completed' : 'failed');
      setEvents(previous => previous.map(item => item.id === event.id ? { ...item, status: popup ? 'completed' : 'failed' } : item));
      if (!popup) setError('Your browser blocked the provider window. Allow pop-ups and try again.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to retry this share.'); }
    finally { setBusyProvider(null); }
  };

  const calendarCells = useMemo(() => {
    const year = calendarCursor.getFullYear();
    const month = calendarCursor.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: Array<{ date: Date | null; items: SocialPublication[] }> = [];
    for (let index = 0; index < firstWeekday; index += 1) cells.push({ date: null, items: [] });
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day);
      const items = publications.filter(publication => {
        const scheduled = new Date(publication.scheduled_at);
        return scheduled.getFullYear() === year && scheduled.getMonth() === month && scheduled.getDate() === day;
      });
      cells.push({ date, items });
    }
    while (cells.length % 7 !== 0) cells.push({ date: null, items: [] });
    return cells;
  }, [calendarCursor, publications]);

  const calendarPanel = <section className="overflow-hidden rounded-2xl border border-line bg-surface">
    <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-accent" /><div><h3 className="text-sm font-semibold text-ink">Content calendar</h3><p className="mt-1 text-xs text-muted">See every scheduled channel in one campaign view.</p></div></div>
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={() => setCalendarCursor(previous => new Date(previous.getFullYear(), previous.getMonth() - 1, 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:border-accent hover:text-accent" aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></button>
        <p className="min-w-32 text-center text-xs font-semibold text-ink">{calendarCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</p>
        <button type="button" onClick={() => setCalendarCursor(previous => new Date(previous.getFullYear(), previous.getMonth() + 1, 1))} className="grid h-9 w-9 place-items-center rounded-lg border border-line text-muted hover:border-accent hover:text-accent" aria-label="Next month"><ChevronRight className="h-4 w-4" /></button>
        <button type="button" onClick={() => { const now = new Date(); setCalendarCursor(new Date(now.getFullYear(), now.getMonth(), 1)); }} className="ml-1 min-h-9 rounded-lg border border-line px-2.5 text-[11px] font-semibold text-body hover:border-accent hover:text-accent">Today</button>
      </div>
    </div>
    <div className="grid grid-cols-7 border-b border-line bg-canvas/60 text-center text-[10px] font-semibold uppercase tracking-wide text-subtle">
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => <div key={day} className="px-1 py-2">{day}</div>)}
    </div>
    <div className="grid grid-cols-7">
      {calendarCells.map((cell, index) => <div key={cell.date ? cell.date.toISOString() : `empty-${index}`} className={`min-h-20 border-b border-r border-line p-1.5 sm:min-h-24 ${cell.date ? 'bg-surface' : 'bg-canvas/35'}`}>
        {cell.date && <><div className="flex items-center justify-between"><span className={`text-[11px] font-semibold ${cell.date.toDateString() === new Date().toDateString() ? 'grid h-5 w-5 place-items-center rounded-full bg-accent text-white' : 'text-muted'}`}>{cell.date.getDate()}</span>{cell.items.length > 0 && <span className="text-[9px] font-semibold text-subtle">{cell.items.length}</span>}</div><div className="mt-1 space-y-1">{cell.items.slice(0, 3).map(item => <div key={item.id} title={`${item.provider} · ${new Date(item.scheduled_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`} className={`truncate rounded-md px-1.5 py-1 text-[9px] font-semibold capitalize ${item.status === 'failed' ? 'bg-danger/10 text-danger' : item.status === 'published' ? 'bg-success/10 text-success' : item.status === 'cancelled' ? 'bg-surface-2 text-muted' : 'bg-accent/10 text-accent'}`}>{item.provider} · {new Date(item.scheduled_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>)}{cell.items.length > 3 && <p className="px-1 text-[9px] text-subtle">+{cell.items.length - 3} more</p>}</div></>}
      </div>)}
    </div>
    {publications.length === 0 && <div className="border-t border-line px-5 py-8 text-center"><p className="text-sm font-semibold text-body">Your calendar is clear</p><p className="mt-1 text-xs text-muted">Schedule a campaign and its channel-by-channel delivery will appear here.</p></div>}
  </section>;

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(targetUrl.trim()); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }
    catch { setError('Copy is unavailable in this browser.'); }
  };

  const publicationPanel = publications.length > 0 ? <section className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="border-b border-line px-5 py-4"><h3 className="text-sm font-semibold text-ink">Scheduled publishing</h3><p className="mt-1 text-xs text-muted">Scheduled posts continue even if you leave the Studio.</p></div><div className="divide-y divide-line">{publications.map(publication => <div key={publication.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-semibold capitalize text-ink">{publication.provider}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${publication.status === 'published' ? 'bg-success/10 text-success' : publication.status === 'failed' ? 'bg-danger/10 text-danger' : publication.status === 'cancelled' ? 'bg-surface-2 text-muted' : 'bg-warning/10 text-warning'}`}>{publication.status}</span><time className="text-[10px] text-subtle">{new Date(publication.scheduled_at).toLocaleString()}</time></div><p className="mt-1 truncate text-[11px] text-muted">{publication.last_error || publication.content}</p></div>{publication.status === 'scheduled' && <button type="button" disabled={scheduling} onClick={() => void cancelScheduledPost(publication)} className="self-start text-[11px] font-semibold text-danger hover:underline disabled:opacity-50 sm:self-auto">Cancel</button>}</div>)}</div></section> : null;

  return <div className="studio-page flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8"><div className="mx-auto w-full max-w-5xl space-y-6">
    <header><div className="flex items-center gap-2"><Share2 className="h-5 w-5 text-accent" /><h2 className="text-lg font-bold text-ink">Share & Publish</h2></div><p className="mt-1 max-w-2xl text-xs leading-5 text-muted">Compose once, then hand off to the networks your audience already uses. LynkFlow records each handoff without storing social credentials.</p></header>
    {error && <div role="alert" className="rounded-xl border border-danger/30 bg-danger-surface p-3 text-xs text-danger">{error}</div>}
    <section className="rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-4"><label htmlFor="social-media-url" className="min-w-0 flex-1 text-xs font-semibold text-body">Media URL <span className="font-normal text-muted">(required for Instagram, TikTok, and YouTube)</span><input id="social-media-url" value={mediaUrl} onChange={event => setMediaUrl(event.target.value)} type="url" className="mt-2 min-h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" placeholder="Paste a media link or upload a file" /></label><label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-canvas px-3 text-xs font-semibold text-body hover:border-accent hover:text-accent has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent/30"><Upload className="h-4 w-4" aria-hidden="true" />{mediaUploading ? 'Uploading…' : 'Upload media'}<input type="file" accept="image/*,video/*" className="sr-only" disabled={mediaUploading} onChange={event => { const file = event.target.files?.[0]; if (file) void uploadSocialMedia(file); event.currentTarget.value = ''; }} /></label><label className="text-xs font-semibold text-body">Media type<select value={instagramMediaType} onChange={event => setInstagramMediaType(event.target.value as 'image' | 'video')} className="mt-2 min-h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-accent"><option value="image">Image</option><option value="video">Video / Reel</option></select></label></div><p className="mt-1 text-[11px] text-muted">Upload directly or paste a public URL. Instagram supports image posts and Reels; TikTok and YouTube require video.</p>{mediaUploadError && <p role="alert" className="mt-2 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[11px] text-danger">{mediaUploadError}</p>}<div className="mt-3 flex flex-wrap justify-end gap-2">{tiktokConnection && <button type="button" disabled={scheduling || busyProvider !== null || tiktokPublishing} onClick={() => void scheduleTikTok()} className="min-h-10 rounded-xl border border-line px-3 text-xs font-semibold text-body hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60">{scheduling ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Schedule TikTok video'}</button>}{instagramConnection && <button type="button" disabled={scheduling || busyProvider !== null || instagramPublishing} onClick={() => void scheduleInstagram()} className="min-h-10 rounded-xl border border-line px-3 text-xs font-semibold text-body hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60">{scheduling ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Schedule Instagram post'}</button>}{youtubeConnection && <button type="button" disabled={scheduling || busyProvider !== null || youtubePublishing} onClick={() => void scheduleYouTube()} className="min-h-10 rounded-xl border border-line px-3 text-xs font-semibold text-body hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60">{scheduling ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Schedule YouTube video'}</button>}</div></section>
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm"><div><p className="text-xs font-semibold text-ink">TikTok publishing</p><p className="mt-1 text-[11px] text-muted">{tiktokConnection ? `Connected as ${tiktokConnection.account_name || 'your TikTok account'}. Video status is confirmed asynchronously by TikTok.` : 'Connect TikTok to send a public video URL directly to your profile.'}</p></div>{tiktokConnection ? <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">Connected</span> : <button type="button" onClick={() => startTikTokOAuth()} className="min-h-10 rounded-xl bg-ink px-3 text-xs font-semibold text-canvas hover:opacity-90">Connect TikTok</button>}</section>
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm"><div><p className="text-xs font-semibold text-ink">Instagram publishing</p><p className="mt-1 text-[11px] text-muted">{instagramConnection ? `Connected as ${instagramConnection.account_name || 'your Instagram account'}. Image and Reel posts are confirmed by Instagram.` : 'Connect Instagram to publish images and Reels directly from LynkFlow.'}</p></div>{instagramConnection ? <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">Connected</span> : <button type="button" onClick={() => startInstagramOAuth()} className="min-h-10 rounded-xl bg-ink px-3 text-xs font-semibold text-canvas hover:opacity-90">Connect Instagram</button>}</section>
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm"><div><p className="text-xs font-semibold text-ink">Facebook Page publishing</p><p className="mt-1 text-[11px] text-muted">{facebookConnection ? `Connected as ${facebookConnection.account_name || 'your Facebook Page'}. Link posts are confirmed by Facebook.` : 'Connect a Facebook Page to publish your message and LynkFlow page link directly.'}</p></div>{facebookConnection ? <div className="flex items-center gap-2"><span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">Connected</span><button type="button" disabled={scheduling || busyProvider !== null || facebookPublishing} onClick={() => void scheduleFacebook()} className="min-h-10 rounded-xl border border-line px-3 text-xs font-semibold text-body hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60">Schedule</button></div> : <button type="button" onClick={() => startFacebookOAuth()} className="min-h-10 rounded-xl bg-ink px-3 text-xs font-semibold text-canvas hover:opacity-90">Connect Facebook</button>}</section>
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm"><div><p className="text-xs font-semibold text-ink">X publishing</p><p className="mt-1 text-[11px] text-muted">{xConnection ? `Connected as ${xConnection.account_name || 'your X account'}. Posts are confirmed by X.` : 'Connect X to publish short updates with your page link directly.'}</p></div>{xConnection ? <div className="flex items-center gap-2"><span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">Connected</span><button type="button" disabled={scheduling || busyProvider !== null || xPublishing} onClick={() => void scheduleX()} className="min-h-10 rounded-xl border border-line px-3 text-xs font-semibold text-body hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60">Schedule</button></div> : <button type="button" onClick={() => startXOAuth()} className="min-h-10 rounded-xl bg-ink px-3 text-xs font-semibold text-canvas hover:opacity-90">Connect X</button>}</section>
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm"><div><p className="text-xs font-semibold text-ink">YouTube publishing</p><p className="mt-1 text-[11px] text-muted">{youtubeConnection ? `Connected as ${youtubeConnection.account_name || 'your YouTube channel'}. Videos are uploaded and confirmed by YouTube.` : 'Connect YouTube to upload a public video URL directly to your channel.'}</p></div>{youtubeConnection ? <div className="flex items-center gap-2"><span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">Connected</span><button type="button" disabled={scheduling || busyProvider !== null || youtubePublishing} onClick={() => void scheduleYouTube()} className="min-h-10 rounded-xl border border-line px-3 text-xs font-semibold text-body hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60">Schedule</button></div> : <button type="button" onClick={() => startYouTubeOAuth()} className="min-h-10 rounded-xl bg-ink px-3 text-xs font-semibold text-canvas hover:opacity-90">Connect YouTube</button>}</section>
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm"><div><p className="text-xs font-semibold text-ink">Threads publishing</p><p className="mt-1 text-[11px] text-muted">{threadsConnection ? `Connected as ${threadsConnection.account_name || 'your Threads account'}. Posts are uploaded and confirmed by Threads.` : 'Connect Threads to publish directly from the shared composer.'}</p></div>{threadsConnection ? <div className="flex items-center gap-2"><span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">Connected</span><button type="button" disabled={scheduling || busyProvider !== null} onClick={() => void scheduleThreads()} className="min-h-10 rounded-xl border border-line px-3 text-xs font-semibold text-body hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60">Schedule</button></div> : <button type="button" onClick={() => startThreadsOAuth()} className="min-h-10 rounded-xl bg-ink px-3 text-xs font-semibold text-canvas hover:opacity-90">Connect Threads</button>}</section>
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm"><details><summary className="cursor-pointer text-sm font-semibold text-ink">Customize captions by platform <span className="font-normal text-muted">(optional)</span></summary><div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-2">{(['instagram', 'tiktok', 'youtube', 'threads', 'x', 'linkedin'] as const).map(provider => <label key={provider} className="text-[11px] font-semibold capitalize text-body">{provider} <span className="font-normal text-muted">{provider === 'x' ? '280' : provider === 'threads' ? '500' : provider === 'youtube' ? '5000' : provider === 'linkedin' ? '3000' : '2200'} max</span><textarea value={captionOverrides[provider] || ''} onChange={event => setCaptionOverrides(previous => ({ ...previous, [provider]: event.target.value }))} placeholder={content} rows={3} className="mt-1 w-full resize-y rounded-lg border border-line bg-canvas px-2.5 py-2 text-xs font-normal text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" /></label>)}</div><p className="mt-3 text-[11px] text-muted">Empty fields reuse the main message. Captions are validated per network before publishing.</p></details></section>
    <section className="flex flex-col gap-3 rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-ink">Schedule this campaign</p><p className="mt-1 text-[11px] text-muted">Create one schedule across every connected channel using each platform’s caption.</p></div><div className="flex flex-wrap items-center gap-2"><label className="text-[11px] font-semibold text-body">Publish at<input aria-label="Campaign publish time" type="datetime-local" value={scheduledAt} min={defaultScheduleTime()} onChange={event => setScheduledAt(event.target.value)} className="ml-2 min-h-10 rounded-xl border border-line bg-canvas px-2 text-xs font-normal text-ink" /></label><button type="button" disabled={scheduling || busyProvider !== null} onClick={() => void scheduleToConnected()} className="min-h-10 rounded-xl bg-accent px-3 text-xs font-bold text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60">{scheduling ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Schedule to connected'}</button></div></section>
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-ink">Audience growth</p><p className="mt-1 text-[11px] text-muted">Sync follower totals from connected social accounts. The total is saved only when every connected provider returns a verified metric.</p></div><button type="button" disabled={syncingFollowers} onClick={() => void syncFollowers()} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-line px-3 text-xs font-semibold text-body hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60">{syncingFollowers ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sync followers'}</button></div>{followerSync && <div className="mt-4 grid gap-3 border-t border-line pt-4 sm:grid-cols-3"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-subtle">Verified total</p><p className="mt-1 text-xl font-bold text-ink">{followerSync.total === null ? '—' : followerSync.total.toLocaleString()}</p></div><div className="sm:col-span-2"><div className="flex flex-wrap gap-2">{followerSync.counts.map(item => <span key={`${item.provider}-${item.accountName}`} className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold capitalize text-success">{item.provider}: {item.count.toLocaleString()}</span>)}{followerSync.failures.map(item => <span key={`${item.provider}-${item.accountName}`} className="rounded-full bg-warning/10 px-2.5 py-1 text-[11px] font-semibold capitalize text-warning">{item.provider}: {item.status}</span>)}</div>{!followerSync.complete && <p className="mt-2 text-[11px] text-warning">The profile number was not changed because one or more connected providers could not verify their metric.</p>}</div></div>}</section>
    {calendarPanel}
    {publicationPanel}
    <section className="rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-ink">LinkedIn publishing</p><p className="mt-1 text-[11px] text-muted">{linkedinConnection ? `Connected as ${linkedinConnection.account_name || 'your LinkedIn account'}. Posts are confirmed by LinkedIn before they are marked complete.` : 'Connect LinkedIn to publish directly. Other networks continue through their native composer.'}</p></div>{linkedinConnection ? <span className="rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-semibold text-success">Connected</span> : <button type="button" onClick={() => startLinkedInOAuth()} className="min-h-10 rounded-xl bg-ink px-3 text-xs font-semibold text-canvas hover:opacity-90">Connect LinkedIn</button>}</div>{linkedinConnection && <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-end"><label className="min-w-0 flex-1 text-[11px] font-semibold text-body">Schedule a LinkedIn post<input type="datetime-local" value={scheduledAt} min={defaultScheduleTime()} onChange={event => setScheduledAt(event.target.value)} className="mt-1 min-h-10 w-full rounded-xl border border-line bg-canvas px-3 text-xs font-normal text-ink" /></label><button type="button" disabled={scheduling || busyProvider !== null || linkedinPublishing} onClick={() => void schedulePost()} className="min-h-10 rounded-xl border border-line px-3 text-xs font-semibold text-body hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60">{scheduling ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Schedule post'}</button></div>}</section>
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-sm"><div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <div className="space-y-4"><div><label htmlFor="share-copy" className="text-xs font-semibold text-body">Your message</label><textarea id="share-copy" value={content} onChange={event => setContent(event.target.value)} maxLength={2800} rows={6} className="mt-2 w-full resize-y rounded-xl border border-line bg-canvas px-3 py-2.5 text-sm leading-relaxed text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" placeholder="Tell people what you are sharing…" /><p className="mt-1 text-right text-[11px] text-muted">{content.length}/2800</p></div><div><label htmlFor="share-url" className="text-xs font-semibold text-body">Page to share</label><div className="mt-2 flex gap-2"><input id="share-url" value={targetUrl} onChange={event => setTargetUrl(event.target.value)} type="url" className="min-h-11 min-w-0 flex-1 rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" /><button type="button" onClick={() => void copyLink()} className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-semibold text-body hover:border-accent hover:text-accent">{copied ? <Check className="h-4 w-4 text-success" /> : <Clipboard className="h-4 w-4" />}{copied ? 'Copied' : 'Copy'}</button></div></div></div>
      <div><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold text-body">Publish once</p><p className="mt-1 text-[11px] text-muted">Send to every connected direct channel and keep each result visible.</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={busyProvider !== null || linkedinPublishing || tiktokPublishing || instagramPublishing || facebookPublishing || youtubePublishing || xPublishing} onClick={() => void publishToConnected()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-accent px-3 text-[11px] font-bold text-white transition hover:opacity-90 disabled:cursor-wait disabled:opacity-60">{busyProvider === 'all' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Publish to connected</button><button type="button" disabled={busyProvider !== null || linkedinPublishing || tiktokPublishing || instagramPublishing || facebookPublishing || youtubePublishing || xPublishing} onClick={() => void openAllProviders()} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[11px] font-semibold text-body transition hover:border-accent hover:text-accent disabled:cursor-wait disabled:opacity-60">{busyProvider === 'all' && <Loader2 className="h-3.5 w-3.5 animate-spin" />}Open composers</button></div></div><div className="mt-2 grid gap-2 sm:grid-cols-2">{PROVIDERS.map(provider => <button key={provider.id} type="button" disabled={busyProvider !== null || linkedinPublishing || tiktokPublishing || instagramPublishing || facebookPublishing || youtubePublishing || xPublishing} onClick={() => void openProvider(provider.id)} className="flex min-h-16 items-center gap-3 rounded-xl border border-line bg-canvas px-3 text-left transition hover:border-accent hover:bg-accent-surface/30 disabled:cursor-wait disabled:opacity-60"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-surface text-accent">{busyProvider === provider.id || (provider.id === 'linkedin' && linkedinPublishing) || (provider.id === 'tiktok' && tiktokPublishing) || (provider.id === 'instagram' && instagramPublishing) || (provider.id === 'facebook' && facebookPublishing) || (provider.id === 'youtube' && youtubePublishing) || (provider.id === 'x' && xPublishing) ? <Loader2 className="h-4 w-4 animate-spin" /> : provider.icon}</span><span className="min-w-0"><span className="block text-xs font-semibold text-ink">{provider.label}</span><span className="mt-0.5 block truncate text-[11px] text-muted">{provider.id === 'linkedin' && linkedinConnection ? 'Publish directly with confirmation' : provider.id === 'linkedin' ? 'Connect for direct publishing' : provider.id === 'tiktok' && tiktokConnection ? 'Publish a video with status tracking' : provider.id === 'tiktok' ? 'Connect for direct video publishing' : provider.id === 'instagram' && instagramConnection ? 'Publish media directly with confirmation' : provider.id === 'instagram' ? 'Connect for direct publishing' : provider.id === 'facebook' && facebookConnection ? 'Publish directly to the connected Page' : provider.id === 'facebook' ? 'Connect a Page for direct publishing' : provider.id === 'youtube' && youtubeConnection ? 'Upload a video directly to your channel' : provider.id === 'youtube' ? 'Connect for direct video publishing' : provider.id === 'x' && xConnection ? 'Publish directly with confirmation' : provider.id === 'x' ? 'Connect for direct publishing' : provider.hint}</span></span><ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-subtle" /></button>)}</div><p className="mt-3 text-[11px] leading-5 text-muted">Direct publishing is available for connected LinkedIn, TikTok, Instagram, Facebook Page, YouTube, and X accounts. Other networks remain explicit native-composer handoffs.</p></div>
    </div></section>
    {broadcastResults.length > 0 && <section className="rounded-2xl border border-line bg-surface px-5 py-4 shadow-sm"><div className="flex items-center gap-2"><Check className="h-4 w-4 text-accent" /><h3 className="text-sm font-semibold text-ink">Delivery results</h3></div><div className="mt-3 grid gap-2 sm:grid-cols-3">{broadcastResults.map(result => <div key={result.provider} className="rounded-xl border border-line bg-canvas p-3"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold capitalize text-ink">{result.provider}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${result.status === 'published' ? 'bg-success/10 text-success' : result.status === 'processing' ? 'bg-warning/10 text-warning' : result.status === 'failed' ? 'bg-danger/10 text-danger' : 'bg-surface-2 text-muted'}`}>{result.status}</span></div><p className="mt-1 text-[11px] leading-4 text-muted">{result.message}</p></div>)}</div></section>}
    <section className="overflow-hidden rounded-2xl border border-line bg-surface"><div className="border-b border-line px-5 py-4"><h3 className="text-sm font-semibold text-ink">Recent share activity</h3><p className="mt-1 text-xs text-muted">A private record of publishing handoffs for @{activeProfile.username}.</p></div>{loading ? <div className="flex items-center justify-center gap-2 p-10 text-xs text-muted"><Loader2 className="h-4 w-4 animate-spin" />Loading activity…</div> : events.length === 0 ? <div className="p-10 text-center text-xs text-muted">No shares yet. Your first handoff will appear here.</div> : <div className="divide-y divide-line">{events.map(event => <div key={event.id} className="flex items-center justify-between gap-3 px-5 py-3"><div className="min-w-0"><div className="flex items-center gap-2"><p className="text-xs font-semibold capitalize text-ink">{event.provider}</p><span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${event.status === 'completed' ? 'bg-success/10 text-success' : event.status === 'failed' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>{event.status}</span></div><p className="mt-1 truncate text-[11px] text-muted">{event.content}</p></div><div className="flex shrink-0 items-center gap-3"><time className="text-[10px] text-subtle">{new Date(event.created_at).toLocaleDateString()}</time>{event.status === 'failed' && <button type="button" disabled={busyProvider !== null} onClick={() => void retryShare(event)} className="text-[11px] font-semibold text-accent hover:underline disabled:cursor-wait disabled:opacity-60">Retry</button>}</div></div>)}</div>}</section>
  </div></div>;
};
