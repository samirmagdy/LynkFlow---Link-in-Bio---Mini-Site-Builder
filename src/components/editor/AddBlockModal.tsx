import React, { useState } from 'react';
import { BlockType } from '../../types';
import { parseBulkLinks } from '../../services/profileMutationService';
import { 
  Link2, 
  Video, 
  Type, 
  Minus, 
  FolderTree, 
  HelpCircle, 
  Quote, 
  FileDown, 
  MailCheck, 
  PhoneCall,
  Images,
  GalleryHorizontal,
  ShoppingBag,
  GraduationCap,
  HandCoins,
  Crown,
  CalendarDays,
  X 
} from 'lucide-react';
import { Dialog } from '../common/Dialog';

interface AddBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: BlockType) => void;
  onImportLinks: (links: Array<{ title: string; url: string }>) => void;
}

export const AddBlockModal: React.FC<AddBlockModalProps> = ({ isOpen, onClose, onSelectType, onImportLinks }) => {
  const [isImporting, setIsImporting] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkError, setBulkError] = useState('');

  const close = () => {
    setIsImporting(false);
    setBulkText('');
    setBulkError('');
    onClose();
  };

  const importLinks = () => {
    const result = parseBulkLinks(bulkText);
    if (result.links.length === 0) {
      setBulkError('Add at least one valid http:// or https:// link.');
      return;
    }
    if (result.invalidLines.length > 0) {
      setBulkError(`Fix line${result.invalidLines.length === 1 ? '' : 's'} ${result.invalidLines.join(', ')} before importing.`);
      return;
    }
    onImportLinks(result.links);
    close();
  };

  if (!isOpen) return null;

  const blockCategories: Array<{
    type: BlockType;
    title: string;
    description: string;
    icon: React.ReactNode;
    badge?: string;
  }> = [
    {
      type: 'link',
      title: 'Link Button',
      description: 'Send visitors to your website, shop, portfolio, or social page',
      icon: <Link2 className="w-5 h-5 text-accent" />,
      badge: 'Core'
    },
    {
      type: 'form',
      title: 'Contact Form',
      description: 'Collect email signups, project inquiries, or messages in one place',
      icon: <MailCheck className="w-5 h-5 text-success" />,
      badge: 'Conversion'
    },
    {
      type: 'media',
      title: 'Photo or Video',
      description: 'Share a photo, video, reel, or audio moment with your audience',
      icon: <Video className="w-5 h-5 text-danger" />
    },
    {
      type: 'gallery',
      title: 'Image Gallery',
      description: 'Show a responsive grid of portfolio, work, or product images',
      icon: <Images className="w-5 h-5 text-accent-soft" />
    },
    {
      type: 'carousel',
      title: 'Swipeable Photos',
      description: 'Let visitors swipe through a sequence of images',
      icon: <GalleryHorizontal className="w-5 h-5 text-warning" />
    },
    {
      type: 'product',
      title: 'Product Card',
      description: 'Feature an item with image, price, description, and purchase link',
      icon: <ShoppingBag className="w-5 h-5 text-lime-400" />,
      badge: 'Commerce'
    },
    {
      type: 'course',
      title: 'Course / Digital Class',
      description: 'Show lessons, sell access, and deliver the course after payment',
      icon: <GraduationCap className="w-5 h-5 text-accent" />,
      badge: 'Commerce'
    },
    {
      type: 'tip',
      title: 'Support / Tips',
      description: 'Let visitors support your work with a secure one-time tip',
      icon: <HandCoins className="w-5 h-5 text-warning" />,
      badge: 'Monetization'
    },
    {
      type: 'membership',
      title: 'Membership',
      description: 'Offer recurring access, perks, and a simple member promise',
      icon: <Crown className="w-5 h-5 text-warning" />,
      badge: 'Recurring'
    },
    {
      type: 'event',
      title: 'Event or Release',
      description: 'Promote a launch, tour date, workshop, livestream, or booking moment',
      icon: <CalendarDays className="w-5 h-5 text-accent" />,
      badge: 'Growth'
    },
    {
      type: 'emailSignup',
      title: 'Email Signup',
      description: 'Collect newsletter subscribers using the consented form pipeline',
      icon: <MailCheck className="w-5 h-5 text-success" />,
      badge: 'Newsletter'
    },
    {
      type: 'folder',
      title: 'Link Collection',
      description: 'Keep related links together in a neat expandable section',
      icon: <FolderTree className="w-5 h-5 text-warning" />
    },
    {
      type: 'file',
      title: 'Downloadable File',
      description: 'Offer PDF media kits, resumes, guides, or digital deliverables',
      icon: <FileDown className="w-5 h-5 text-info" />
    },
    {
      type: 'faq',
      title: 'Frequently Asked Questions',
      description: 'Answer common questions with simple expandable answers',
      icon: <HelpCircle className="w-5 h-5 text-accent-soft" />
    },
    {
      type: 'testimonial',
      title: 'Testimonial & Review',
      description: 'Display social proof, client quotes, ratings, and endorsements',
      icon: <Quote className="w-5 h-5 text-danger" />
    },
    {
      type: 'text',
      title: 'Heading / Paragraph',
      description: 'Add section headers, bio details, quotes, or announcements',
      icon: <Type className="w-5 h-5 text-body" />
    },
    {
      type: 'contact',
      title: 'Contact Me',
      description: 'Give visitors a quick way to email, call, or message you',
      icon: <PhoneCall className="w-5 h-5 text-info" />
    },
    {
      type: 'divider',
      title: 'Divider / Spacer',
      description: 'Visual separation lines or vertical spacing between sections',
      icon: <Minus className="w-5 h-5 text-muted" />
    }
  ];

  return (
    <Dialog open={isOpen} onClose={onClose} labelledBy="add-block-title" className="w-full max-w-xl bg-surface border border-line rounded-2xl p-6 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
          <div>
            <h3 id="add-block-title" className="text-base font-bold text-ink tracking-tight">Add Content Block</h3>
            <p className="text-xs text-muted">Choose a block type to add to your current profile tab</p>
          </div>
          <button
            onClick={close}
            aria-label="Close add block dialog"
            className="touch-target p-1 rounded-lg text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isImporting ? <>
        <div className="mb-3 rounded-xl border border-accent/20 bg-accent/5 p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-ink">Have several links already?</p>
              <p className="mt-0.5 text-[11px] text-muted">Paste them all at once and we’ll build the buttons for you.</p>
            </div>
            <button type="button" onClick={() => setIsImporting(true)} className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent/90">Paste links</button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1">
          {blockCategories.map((item) => (
            <button
              key={item.type}
              onClick={() => {
                onSelectType(item.type);
                close();
              }}
              className="p-3.5 rounded-xl border border-line bg-canvas/60 hover:bg-surface-2/80 hover:border-line-strong text-left transition-all duration-150 flex items-start gap-3 group cursor-pointer"
            >
              <div className="p-2 rounded-lg bg-surface border border-line shrink-0 group-hover:scale-105 transition-transform">
                {item.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-semibold text-ink group-hover:text-accent-soft transition-colors">
                    {item.title}
                  </span>
                  {item.badge && (
                    <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded-full bg-surface-2 text-body">
                      {item.badge}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted leading-tight">
                  {item.description}
                </p>
              </div>
            </button>
          ))}
        </div>
        </> : <div className="space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-ink">Paste your links</h4>
            <p className="mt-1 text-xs text-muted">One URL per line, or use <span className="font-medium">Title | URL</span>. Up to 50 links.</p>
          </div>
          <textarea
            autoFocus
            value={bulkText}
            onChange={(event) => { setBulkText(event.target.value); setBulkError(''); }}
            placeholder={'Portfolio | https://example.com\nhttps://instagram.com/yourname'}
            className="min-h-48 w-full resize-y rounded-xl border border-line bg-canvas p-3 text-sm text-ink outline-none placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent/20"
            aria-label="Links to import"
          />
          {bulkError && <p role="alert" className="text-xs font-medium text-danger">{bulkError}</p>}
          <div className="flex justify-end gap-2 border-t border-line pt-3">
            <button type="button" onClick={() => { setIsImporting(false); setBulkError(''); }} className="rounded-lg border border-line px-3 py-2 text-xs font-semibold text-body hover:bg-surface-2">Back</button>
            <button type="button" onClick={importLinks} className="rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accent/90">Add links</button>
          </div>
        </div>}
    </Dialog>
  );
};
