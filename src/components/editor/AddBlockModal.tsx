import React from 'react';
import { BlockType } from '../../types';
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
  X 
} from 'lucide-react';
import { Dialog } from '../common/Dialog';

interface AddBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: BlockType) => void;
}

export const AddBlockModal: React.FC<AddBlockModalProps> = ({ isOpen, onClose, onSelectType }) => {
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
      title: 'Link Card',
      description: 'Redirect visitors to any website, product, portfolio, or newsletter',
      icon: <Link2 className="w-5 h-5 text-accent" />,
      badge: 'Core'
    },
    {
      type: 'form',
      title: 'Lead & Subscribe Form',
      description: 'Collect email signups, quote inquiries, or messages directly into your inbox',
      icon: <MailCheck className="w-5 h-5 text-success" />,
      badge: 'Conversion'
    },
    {
      type: 'media',
      title: 'Video / Embed',
      description: 'Embed YouTube videos, reels, Spotify players, or image banners',
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
      title: 'Image Carousel',
      description: 'Present a swipeable sequence of images with optional links',
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
      type: 'emailSignup',
      title: 'Email Signup',
      description: 'Collect newsletter subscribers using the consented form pipeline',
      icon: <MailCheck className="w-5 h-5 text-success" />,
      badge: 'Newsletter'
    },
    {
      type: 'folder',
      title: 'Folder / Collection',
      description: 'Collapsible group of related links or sub-resources to keep page clean',
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
      title: 'FAQ Accordion',
      description: 'Answer frequent audience questions in interactive expandable panels',
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
      title: 'Direct Contact',
      description: 'Quick mailto or phone dial action card with subject preset',
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
            onClick={onClose}
            aria-label="Close add block dialog"
            className="touch-target p-1 rounded-lg text-muted hover:text-ink hover:bg-surface-2 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 overflow-y-auto pr-1">
          {blockCategories.map((item) => (
            <button
              key={item.type}
              onClick={() => {
                onSelectType(item.type);
                onClose();
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
                    <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded-full bg-surface-2 text-body">
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
    </Dialog>
  );
};
