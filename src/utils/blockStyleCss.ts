/** Shared visual language for the block variant system. Kept CSS-only so it is
 * included in the static public renderer without adding a runtime dependency. */
export const BLOCK_STYLE_CSS = `
.profile-theme-root [data-block-style=image] a{background-size:cover;background-position:center;background-blend-mode:multiply}
@media(hover:hover){.profile-theme-root [data-block-style=image]{perspective:900px}.profile-theme-root [data-block-style=image]>a{transform-style:preserve-3d;transition:transform .24s ease,box-shadow .24s ease}.profile-theme-root [data-block-style=image]>a:hover{transform:translateY(-3px) rotateX(1deg) rotateY(-1deg);box-shadow:0 18px 34px rgba(0,0,0,.16)}}
.profile-theme-root [data-block-style=editorial]{border-inline-start:3px solid var(--theme-accent,#6366f1);padding-inline-start:1rem}
.profile-theme-root [data-block-style=display] h2,.profile-theme-root [data-block-style=display] h3{font-size:clamp(1.5rem,6vw,2.6rem);letter-spacing:-.05em}
.profile-theme-root [data-block-style=announcement]{background:color-mix(in srgb,var(--theme-accent,#6366f1) 12%,transparent);border:1px solid color-mix(in srgb,var(--theme-accent,#6366f1) 28%,transparent);border-radius:999px;padding:.65rem 1rem}
.profile-theme-root [data-block-style=body]{max-width:58ch;margin-inline:auto}
.profile-theme-root [data-block-style=offer]{border:1px solid var(--theme-accent,#6366f1);box-shadow:0 14px 32px color-mix(in srgb,var(--theme-accent,#6366f1) 18%,transparent)}
.profile-theme-root [data-block-style=service]{border-radius:var(--theme-card-radius,16px) 0 var(--theme-card-radius,16px)}
.profile-theme-root [data-block-style=directory] a,.profile-theme-root [data-block-style=tabbed] a{border-inline-start:3px solid var(--theme-accent,#6366f1);border-radius:0!important}
.profile-theme-root [data-block-style=nested]{margin-inline:1rem;border-inline-start:2px solid var(--theme-accent,#6366f1)}
.profile-theme-root [data-block-style=columns] .space-y-2{columns:2;column-gap:1rem}
.profile-theme-root [data-block-style=columns] .space-y-2>*{break-inside:avoid}
.profile-theme-root [data-block-style=featured] h4{font-size:1rem;letter-spacing:-.02em}
.profile-theme-root [data-block-style=searchable]{outline:1px solid color-mix(in srgb,var(--theme-accent,#6366f1) 28%,transparent)}
.profile-theme-root [data-block-style=logo] blockquote:before{content:'✦';display:block;color:var(--theme-accent,#6366f1);font-style:normal;font-size:1.4rem}
.profile-theme-root [data-block-style=rating]{background:linear-gradient(135deg,color-mix(in srgb,var(--theme-accent,#6366f1) 10%,transparent),transparent)}
.profile-theme-root [data-block-style=compact] blockquote{font-size:.9em;margin-bottom:.5rem}
.profile-theme-root [data-block-style=row]{padding-block:.5rem!important}
.profile-theme-root [data-block-style=stack]>*{box-shadow:0 7px 0 color-mix(in srgb,var(--theme-accent,#6366f1) 14%,transparent)}
.profile-theme-root [data-block-style=gated]{position:relative;overflow:hidden}
.profile-theme-root [data-block-style=gated]:after{content:'Protected resource';display:block;margin-top:.6rem;color:var(--theme-accent,#6366f1);font-size:.7rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase}
.profile-theme-root [data-block-style=inline] form,.profile-theme-root [data-block-style=inline] form>div{display:flex;align-items:end;gap:.5rem}
.profile-theme-root [data-block-style=inline] form>div{flex:1;display:block}
.profile-theme-root [data-block-style=inline] button{width:auto;white-space:nowrap}
.profile-theme-root [data-block-style=booking] button{border-radius:999px}
.profile-theme-root [data-block-style=conversational] form{border-inline-start:3px solid var(--theme-accent,#6366f1);padding-inline-start:.75rem}
.profile-theme-root [data-block-style=benefits] p:before{content:'✓';color:var(--theme-accent,#6366f1);font-weight:800;margin-inline-end:.35rem}
.profile-theme-root [data-block-style=icon] hr:before{content:'✦';display:block;width:max-content;margin:-.65rem auto 0;padding:0 .5rem;color:var(--theme-accent,#6366f1)}
.profile-theme-root [data-block-style=whatsapp] .rounded-full{background:#25d366!important;color:#071b0d!important}
.profile-theme-root [data-block-style=email] .rounded-full{background:color-mix(in srgb,var(--theme-accent,#6366f1) 16%,transparent)}
@media(max-width:639px){
  .profile-theme-root [data-block-style=columns] .space-y-2{columns:1}
  .profile-theme-root [data-block-style=inline] form{display:block}
  .profile-theme-root [data-block-style=inline] button{width:100%;margin-top:.5rem}
}
@media(prefers-reduced-motion:reduce){.profile-theme-root [data-block-style]{scroll-behavior:auto;transition:none!important}}
`;
