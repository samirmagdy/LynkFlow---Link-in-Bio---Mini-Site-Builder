import React from 'react';
import './illustrations.css';

export type IllustrationVariant = 'assembly' | 'theme' | 'route' | 'onboarding' | 'empty-blocks' | 'inbox' | 'profiles' | 'domain' | 'privacy' | 'qr';

interface ProductIllustrationProps {
  variant: IllustrationVariant;
  className?: string;
  label?: string;
  decorative?: boolean;
}

const Frame: React.FC<React.PropsWithChildren<ProductIllustrationProps>> = ({ children, className = '', label, decorative = true }) => (
  <svg viewBox="0 0 480 300" role={decorative ? 'presentation' : 'img'} aria-label={decorative ? undefined : label} aria-hidden={decorative ? true : undefined} className={`product-illustration ${className}`} focusable="false">
    <defs>
      <linearGradient id="illustration-surface" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#23233a" /><stop offset="1" stopColor="#101018" /></linearGradient>
      <linearGradient id="illustration-accent" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8b7cff" /><stop offset="1" stopColor="#5b4bff" /></linearGradient>
    </defs>
    {children}
  </svg>
);

const Card: React.FC<{ x: number; y: number; width?: number; height?: number; accent?: string; className?: string }> = ({ x, y, width = 116, height = 42, accent = '#8b7cff', className = '' }) => (
  <g className={className} transform={`translate(${x} ${y})`}>
    <rect width={width} height={height} rx="12" fill="url(#illustration-surface)" stroke="#34344b" />
    <rect x="10" y="10" width="22" height="22" rx="7" fill={`${accent}22`} stroke={accent} strokeOpacity=".5" />
    <rect x="42" y="11" width={Math.max(34, width - 62)} height="5" rx="2.5" fill="#eeecff" fillOpacity=".8" />
    <rect x="42" y="22" width={Math.max(22, width - 80)} height="4" rx="2" fill="#aaa7c2" fillOpacity=".55" />
  </g>
);

export const ProductIllustration: React.FC<ProductIllustrationProps> = (props) => {
  const { variant } = props;
  if (variant === 'assembly') return <Frame {...props} label="Blocks assembling into a published creator page">
    <rect x="28" y="22" width="424" height="256" rx="24" fill="#0d0d14" stroke="#303047" />
    <path d="M72 74h336M72 228h336" stroke="#29293d" strokeDasharray="4 8" />
    <g className="illustration-sprite illustration-sprite--header"><circle cx="104" cy="104" r="25" fill="url(#illustration-accent)" /><circle cx="104" cy="104" r="8" fill="#f6f4ff" fillOpacity=".9" /><rect x="143" y="92" width="118" height="8" rx="4" fill="#f5f3ff" /><rect x="143" y="108" width="78" height="5" rx="2.5" fill="#9e9ab7" /></g>
    <Card x={72} y={145} className="illustration-sprite illustration-sprite--card-one" /><Card x={200} y={145} accent="#f59e0b" className="illustration-sprite illustration-sprite--card-two" /><Card x={328} y={145} accent="#36d399" className="illustration-sprite illustration-sprite--card-three" />
    <g className="illustration-sprite illustration-sprite--badge"><rect x="176" y="238" width="128" height="22" rx="11" fill="#17172a" stroke="#5551a8" /><circle cx="192" cy="249" r="4" fill="#36d399" /><text x="204" y="253" fill="#c9c5e7" fontSize="10" fontFamily="ui-monospace, monospace">PUBLISHED</text></g>
  </Frame>;

  if (variant === 'theme') return <Frame {...props} label="One profile transforming across multiple visual themes">
    <rect x="50" y="36" width="270" height="224" rx="20" fill="url(#illustration-surface)" stroke="#34344b" /><circle cx="98" cy="82" r="23" fill="#f4b183" className="illustration-sprite illustration-sprite--theme-orb" /><rect x="136" y="72" width="104" height="8" rx="4" fill="#f5f3ff" /><rect x="136" y="88" width="67" height="5" rx="2.5" fill="#aaa7c2" />
    <Card x={72} y={125} width={226} accent="#8b7cff" className="illustration-sprite illustration-sprite--theme-card" /><Card x={72} y={177} width={226} accent="#f59e0b" className="illustration-sprite illustration-sprite--theme-card-two" />
    <g className="illustration-sprite illustration-sprite--swatches"><circle cx="364" cy="100" r="20" fill="#8b7cff" /><circle cx="364" cy="150" r="20" fill="#f59e0b" /><circle cx="364" cy="200" r="20" fill="#36d399" /><path d="M364 120v10M364 170v10" stroke="#77738f" strokeWidth="2" /></g>
  </Frame>;

  if (variant === 'route' || variant === 'domain') return <Frame {...props} label="A creator domain routing to a published profile">
    <g className="illustration-sprite illustration-sprite--route-left"><rect x="36" y="105" width="132" height="72" rx="16" fill="url(#illustration-surface)" stroke="#34344b" /><circle cx="68" cy="141" r="13" fill="#8b7cff" fillOpacity=".2" stroke="#8b7cff" /><path d="M62 141h12M68 135v12" stroke="#e9e7ff" strokeWidth="2" /><text x="91" y="137" fill="#f5f3ff" fontSize="11" fontFamily="ui-monospace, monospace">creator.com</text><text x="91" y="153" fill="#9894ae" fontSize="9" fontFamily="ui-monospace, monospace">verified</text></g>
    <path d="M175 141h118" stroke="#7771ff" strokeWidth="3" strokeDasharray="8 8" className="illustration-sprite illustration-sprite--route-line" /><path d="m284 132 12 9-12 9" fill="none" stroke="#7771ff" strokeWidth="3" />
    <g className="illustration-sprite illustration-sprite--route-right"><rect x="310" y="76" width="130" height="130" rx="20" fill="#0d0d14" stroke="#34344b" /><circle cx="375" cy="112" r="19" fill="url(#illustration-accent)" /><rect x="337" y="146" width="76" height="7" rx="3.5" fill="#f5f3ff" /><rect x="347" y="162" width="56" height="5" rx="2.5" fill="#9894ae" /><circle cx="417" cy="84" r="12" fill="#36d399" /><path d="m411 84 4 4 7-8" fill="none" stroke="#07130e" strokeWidth="2" /></g>
  </Frame>;

  if (variant === 'onboarding') return <Frame {...props} label="A blank profile becoming a published page">
    <rect x="42" y="55" width="396" height="190" rx="22" fill="#0d0d14" stroke="#303047" /><g className="illustration-sprite illustration-sprite--seed"><circle cx="112" cy="138" r="30" fill="#8b7cff" fillOpacity=".16" stroke="#8b7cff" /><path d="M98 138h28M112 124v28" stroke="#d8d5ff" strokeWidth="3" strokeLinecap="round" /></g><path d="M150 138h52" stroke="#5f5a80" strokeWidth="2" strokeDasharray="5 6" /><path d="m195 130 10 8-10 8" fill="none" stroke="#8b7cff" strokeWidth="2" />
    <g className="illustration-sprite illustration-sprite--onboard-page"><rect x="228" y="78" width="164" height="132" rx="16" fill="url(#illustration-surface)" stroke="#4b4770" /><circle cx="264" cy="108" r="18" fill="#f4b183" /><rect x="295" y="102" width="64" height="6" rx="3" fill="#f5f3ff" /><rect x="247" y="143" width="126" height="25" rx="9" fill="#5b4bff" fillOpacity=".7" /><rect x="247" y="177" width="92" height="7" rx="3.5" fill="#9894ae" /></g><circle cx="398" cy="73" r="10" fill="#36d399" className="illustration-sprite illustration-sprite--success" /><path d="m393 73 4 4 7-8" fill="none" stroke="#07130e" strokeWidth="2" />
  </Frame>;

  if (variant === 'privacy') return <Frame {...props} label="Privacy-first analytics represented as anonymous aggregated signals">
    <g className="illustration-sprite illustration-sprite--privacy-shield">
      <path d="M164 58 240 34l76 24v67c0 55-33 91-76 116-43-25-76-61-76-116z" fill="url(#illustration-surface)" stroke="#5eead4" strokeWidth="3" />
      <path d="M240 86c-26 0-47 20-47 45 0 25 21 45 47 45s47-20 47-45c0-25-21-45-47-45z" fill="#0d0d14" stroke="#5eead4" strokeOpacity=".55" />
      <circle cx="219" cy="124" r="7" fill="#8b7cff" /><circle cx="240" cy="111" r="7" fill="#36d399" /><circle cx="261" cy="124" r="7" fill="#f59e0b" /><path d="M219 143c13 8 29 8 42 0" fill="none" stroke="#aaa7c2" strokeWidth="4" strokeLinecap="round" />
    </g>
    <g className="illustration-sprite illustration-sprite--privacy-signals"><path d="M96 116h32M352 116h32M96 150h45M339 150h45M112 184h28M340 184h28" stroke="#7771ff" strokeWidth="3" strokeLinecap="round" strokeDasharray="5 7" /><circle cx="80" cy="116" r="6" fill="#8b7cff" /><circle cx="400" cy="116" r="6" fill="#36d399" /><circle cx="96" cy="184" r="6" fill="#f59e0b" /><circle cx="384" cy="184" r="6" fill="#8b7cff" /></g>
  </Frame>;

  if (variant === 'qr') return <Frame {...props} label="A decorative QR code scanning and routing to a profile">
    <g className="illustration-sprite illustration-sprite--qr-card"><rect x="134" y="42" width="212" height="212" rx="24" fill="#0d0d14" stroke="#34344b" /><g fill="#d8d5ff"><rect x="166" y="74" width="38" height="38" rx="4" /><rect x="176" y="84" width="18" height="18" rx="2" fill="#0d0d14" /><rect x="276" y="74" width="38" height="38" rx="4" /><rect x="286" y="84" width="18" height="18" rx="2" fill="#0d0d14" /><rect x="166" y="184" width="38" height="38" rx="4" /><rect x="176" y="194" width="18" height="18" rx="2" fill="#0d0d14" /><rect x="224" y="78" width="12" height="12" /><rect x="244" y="78" width="12" height="12" /><rect x="224" y="98" width="12" height="12" /><rect x="244" y="118" width="12" height="12" /><rect x="264" y="118" width="12" height="12" /><rect x="224" y="138" width="12" height="12" /><rect x="244" y="158" width="12" height="12" /><rect x="264" y="178" width="12" height="12" /><rect x="224" y="198" width="12" height="12" /><rect x="244" y="218" width="12" height="12" /></g><path d="M151 158h178" stroke="#f59e0b" strokeWidth="3" strokeOpacity=".85" className="illustration-sprite illustration-sprite--qr-scan" /></g>
    <g className="illustration-sprite illustration-sprite--qr-route"><path d="M74 260h332" stroke="#7771ff" strokeWidth="3" strokeDasharray="7 8" /><circle cx="74" cy="260" r="7" fill="#f59e0b" /><circle cx="406" cy="260" r="7" fill="#36d399" /></g>
  </Frame>;

  if (variant === 'empty-blocks') return <Frame {...props} label="An empty page ready for its first block">
    <rect x="94" y="35" width="292" height="230" rx="22" fill="#0d0d14" stroke="#303047" /><circle cx="240" cy="101" r="25" fill="#8b7cff" fillOpacity=".15" stroke="#8b7cff" strokeDasharray="4 5" className="illustration-sprite illustration-sprite--empty-ring" /><path d="M240 88v26M227 101h26" stroke="#d8d5ff" strokeWidth="3" strokeLinecap="round" /><rect x="139" y="151" width="202" height="27" rx="9" fill="#17172a" stroke="#4b4770" strokeDasharray="5 5" className="illustration-sprite illustration-sprite--empty-card" /><rect x="177" y="194" width="126" height="7" rx="3.5" fill="#57536e" /><rect x="195" y="211" width="90" height="6" rx="3" fill="#3d3a50" />
  </Frame>;

  if (variant === 'inbox') return <Frame {...props} label="A secure inbox waiting for form submissions">
    <path d="M120 112h240l-25 118H145z" fill="#17172a" stroke="#4b4770" strokeWidth="2" /><path d="m120 112 120 76 120-76" fill="#23233a" stroke="#5a5680" strokeWidth="2" /><g className="illustration-sprite illustration-sprite--inbox-mail"><rect x="184" y="70" width="112" height="72" rx="12" fill="url(#illustration-surface)" stroke="#8b7cff" /><path d="m188 80 52 37 52-37" fill="none" stroke="#b9b4ff" strokeWidth="3" /></g><circle cx="341" cy="91" r="12" fill="#36d399" /><path d="m335 91 4 4 8-9" fill="none" stroke="#07130e" strokeWidth="2" />
  </Frame>;

  return <Frame {...props} label="Multiple creator profiles inside one workspace">
    <g className="illustration-sprite illustration-sprite--profile-back"><Card x={70} y={92} width={160} height={82} accent="#f59e0b" /></g><g className="illustration-sprite illustration-sprite--profile-mid"><Card x={100} y={111} width={160} height={82} accent="#36d399" /></g><g className="illustration-sprite illustration-sprite--profile-front"><Card x={130} y={130} width={160} height={82} accent="#8b7cff" /></g><path d="M320 151h78" stroke="#7771ff" strokeWidth="3" strokeDasharray="8 8" /><path d="m390 142 12 9-12 9" fill="none" stroke="#7771ff" strokeWidth="3" /><rect x="327" y="104" width="92" height="94" rx="18" fill="#17172a" stroke="#4b4770" /><path d="M349 133h48M349 149h34M349 165h42" stroke="#c8c4e0" strokeWidth="5" strokeLinecap="round" />
  </Frame>;
};
