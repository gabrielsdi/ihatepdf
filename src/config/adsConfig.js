// Central configuration for Ads in ihatepdf
// Set `enabled: false` to completely remove all ads, sidebars, and download modals.

export const ADS_CONFIG = {
  // Master toggle: set to false to disable all ad features instantly
  enabled: true,

  // Duration in seconds for pre-download modal countdown
  counterSeconds: 5,

  // Show sidebars in PDFEditor
  showSidebars: true,

  // Show pre-download modal before downloading PDF
  showDownloadModal: true,

  // Ad provider type: 'placeholder' | 'monetag' | 'adsterra' | 'custom'
  provider: 'monetag',

  // Monetag Smartlink / Direct Link URL
  directLink: 'https://omg10.com/4/11815126',

  // Network snippet placeholders / script URLs if needed by provider
  scripts: {
    sidebarLeftScript: '',
    sidebarRightScript: '',
    modalAdScript: '',
  },
};
