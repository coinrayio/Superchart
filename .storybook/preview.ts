import "@superchart/index.less"

// Preload the icomoon icon font used by orderLine overlay's cancel button.
// Canvas renders text with fontFamily:'icomoon' — if the font isn't loaded yet,
// the glyph (\ue900) renders as garbled fallback characters.
if (typeof document !== 'undefined' && 'fonts' in document) {
  document.fonts.load('12px icomoon', '\ue900')
}

export const parameters = {
  layout: "fullscreen",
}
