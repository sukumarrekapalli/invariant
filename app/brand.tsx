export function InvariantMark({ className = '' }: { className?: string }) {
  return <svg className={className} viewBox="0 0 40 40" aria-hidden="true"><path d="M7 8h26M7 20h19M7 32h26"/><path className="caret" d="m27 15 6 5-6 5"/></svg>;
}

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <span className={`invariant-brand ${inverse ? 'inverse' : ''}`}><InvariantMark/><span>INVARIANT</span></span>;
}
