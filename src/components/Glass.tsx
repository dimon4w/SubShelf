/**
 * SVG displacement filter used by `.refract .glass` (backdrop-filter: url(#liquid-glass)).
 * Chromium (Android Chrome / WebView) applies it to the backdrop; elsewhere the CSS falls back to plain blur.
 */
export function GlassFilter() {
  return (
    <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
      <filter
        id="liquid-glass"
        x="0%"
        y="0%"
        width="100%"
        height="100%"
        colorInterpolationFilters="sRGB"
      >
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.006 0.009"
          numOctaves="2"
          seed="11"
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation="3" result="softNoise" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="softNoise"
          scale="46"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </svg>
  )
}

/** Slow-drifting colour fields behind everything: glass needs something to refract. */
export function Aurora() {
  return (
    <div aria-hidden="true" className="aurora">
      <span className="blob blob-a" />
      <span className="blob blob-b" />
      <span className="blob blob-c" />
    </div>
  )
}
