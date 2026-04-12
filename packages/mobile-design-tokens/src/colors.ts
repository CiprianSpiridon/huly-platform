/**
 * Huly mobile design tokens — color palettes.
 *
 * Values are ported directly from packages/theme/styles/_colors.scss.
 * Dark theme is the primary mobile theme; light theme provided for completeness.
 */

export const commonColors = {
  white: '#FFFFFF',
  black: '#000000',

  // Primary button
  primaryButtonDefault: '#205DC2',
  primaryButtonHovered: '#3575DE',
  primaryButtonPressed: '#1C52AB',
  primaryButtonOutline: '#5190EC',
  primaryButtonTransparent: 'rgba(43, 81, 144, 0.2)',

  // Secondary button
  secondaryButtonDefault: '#D3E1F8',
  secondaryButtonHovered: '#BDD2F5',
  secondaryButtonPressed: '#A7C3F1',

  // Positive
  positiveDefault: '#05A05C',
  positiveHovered: '#05AD63',
  positivePressed: '#019253',

  // Negative
  negativeDefault: '#CB4B42',
  negativeHovered: '#DC5148',
  negativePressed: '#B34139',

  // System
  systemError: '#EE7A7A',

  // Activity status
  statusActive: '#34DB80',
  statusDnd: '#D95757',
  statusBusy: '#FCC500',
  statusAway: '#9099A2',

  // Accent colors
  primaryBlue: '#2C23D5',
  grayscaleGrey03: '#77818E',
  purple01: '#4C38BD',
  purple02: '#6452DB',
  purple03: '#9D92C4',
  orange01: '#CC4726',
  orange02: '#F47758',
  skyblue: '#93CAF3',
  pink: '#FA8DA1',

  // Highlights
  highlightBlue: '#0084FF',
  highlightRed: '#CB4B42',

  // Link
  linkColor: '#377AE6',
} as const

export const darkColors = {
  // Backgrounds
  bgColor: '#161719',
  bgAccent: 'rgba(0, 0, 0, 0.08)',
  bgDark: 'rgba(0, 0, 0, 0.2)',
  backColor: '#0E0F10',
  overlayColor: 'rgba(0, 0, 0, 0.3)',
  statusbarColor: '#0E0F10',

  // Navigation panel
  navpanelColor: '#0E0F10',
  navpanelHovered: 'rgba(255, 255, 255, 0.04)',
  navpanelSelected: 'rgba(255, 255, 255, 0.08)',
  navpanelDivider: 'rgba(255, 255, 255, 0.1)',
  navpanelIconsColor: '#7F7F7F',

  // Component
  compHeaderColor: '#1E2024',
  dividerColor: 'rgba(255, 255, 255, 0.06)',
  bgDividerColor: '#22242A',

  // Text
  transColor: 'rgba(255, 255, 255, 0.3)',
  darkerColor: 'rgba(255, 255, 255, 0.4)',
  halfcontentColor: 'rgba(255, 255, 255, 0.5)',
  darkColor: 'rgba(255, 255, 255, 0.6)',
  contentColor: 'rgba(255, 255, 255, 0.8)',
  captionColor: '#FFFFFF',

  // Buttons
  buttonDefault: 'rgba(255, 255, 255, 0.03)',
  buttonHovered: 'rgba(255, 255, 255, 0.07)',
  buttonPressed: 'rgba(255, 255, 255, 0.11)',
  buttonBorder: 'rgba(255, 255, 255, 0.09)',
  buttonDisabled: 'transparent',
  buttonContainerColor: '#22262B',

  // Popup
  popupColor: '#1F2328',
  popupHover: '#2C3139',
  popupDivider: 'rgba(255, 255, 255, 0.08)',
  popupHeader: '#323842',
  popupDeactivated: '#161719',

  // Panel
  panelColor: '#161719',

  // List
  listBorderColor: 'rgba(255, 255, 255, 0.05)',
  listHeaderColor: '#C88C65',
  listSubheaderColor: '#22242A',
  listRowColor: '#1D1F23',
  listDividerColor: 'rgba(255, 255, 255, 0.09)',
  listButtonColor: '#22242A',
  listButtonHover: '#2A2C32',

  // Highlights
  highlightHover: '#2A2E34',
  highlightSelect: '#2C3139',
  highlightSelectBorder: '#3D4450',
  highlightSelectHover: '#323842',

  // Accent
  accentBgColor: '#22262B',
  darkColorSolid: '#62666D',
  contentColorSolid: '#8A8F98',
  accentColorSolid: '#D7D8DB',
  captionColorSolid: '#F7F8F8',

  // Scrollbar
  scrollbarBar: '#35354A',
  scrollbarBarHover: '#8A8AA5',

  // Input / editbox
  editboxFocusBorder: '#5190EC',

  // Toggle
  toggleBgColor: 'rgba(120, 120, 128, 0.32)',
  toggleOnBgColor: '#205DC2',

  // Status
  errorColor: '#EB5757',
  urgentColor: '#F5694A',
  warningColor: '#F2994A',
  wonColor: '#34DB80',
  lostColor: '#EB5757',

  // Tooltip
  tooltipColor: 'rgba(255, 255, 255, 0.8)',
  tooltipBg: '#2C3139',

  // Avatar
  avatarBgColor: '#4F5358',
  avatarBorderColor: 'rgba(255, 255, 255, 0.1)',

  // Misc solids
  inboxNotify: '#F47758',

  // Card
  cardShadowColor: 'rgba(0, 0, 0, 0.5)',
  cardOverlayColor: 'rgba(28, 29, 31, 0.5)',
} as const

export const lightColors = {
  // Backgrounds
  bgColor: '#F1F1F4',
  bgAccent: 'rgba(255, 255, 255, 0.08)',
  bgDark: 'rgba(255, 255, 255, 0.8)',
  backColor: '#D9D9DD',
  overlayColor: 'rgba(0, 0, 0, 0.2)',
  statusbarColor: '#FFFFFF',

  // Navigation panel
  navpanelColor: '#FBFBFC',
  navpanelHovered: 'rgba(0, 0, 0, 0.04)',
  navpanelSelected: 'rgba(0, 0, 0, 0.08)',
  navpanelDivider: 'rgba(0, 0, 0, 0.1)',
  navpanelIconsColor: '#7F7F7F',

  // Component
  compHeaderColor: '#FBFBFC',
  dividerColor: 'rgba(0, 0, 0, 0.06)',
  bgDividerColor: '#E3E3E5',

  // Text
  transColor: 'rgba(0, 0, 0, 0.3)',
  darkerColor: 'rgba(0, 0, 0, 0.4)',
  halfcontentColor: 'rgba(0, 0, 0, 0.5)',
  darkColor: 'rgba(0, 0, 0, 0.6)',
  contentColor: 'rgba(0, 0, 0, 0.8)',
  captionColor: '#000000',

  // Buttons
  buttonDefault: 'rgba(0, 0, 0, 0.02)',
  buttonHovered: 'rgba(0, 0, 0, 0.04)',
  buttonPressed: 'rgba(0, 0, 0, 0.08)',
  buttonBorder: 'rgba(0, 0, 0, 0.09)',
  buttonDisabled: 'rgba(0, 0, 0, 0.08)',
  buttonContainerColor: '#F1F1F1',

  // Popup
  popupColor: '#FFFFFF',
  popupHover: '#EBEBEB',
  popupDivider: 'rgba(0, 0, 0, 0.09)',
  popupHeader: '#EBEBEB',
  popupDeactivated: '#C7C8CA',

  // Panel
  panelColor: '#FFFFFF',

  // List
  listBorderColor: 'rgba(0, 0, 0, 0.09)',
  listSubheaderColor: '#EEEEF0',
  listRowColor: '#F7F7F8',
  listDividerColor: 'rgba(0, 0, 0, 0.07)',
  listButtonColor: '#F2F2F4',
  listButtonHover: '#E8E8EA',

  // Highlights
  highlightHover: '#E8E8E9',
  highlightSelect: '#F0F4FF',
  highlightSelectBorder: '#E6EAFF',
  highlightSelectHover: '#E4EBFF',

  // Accent
  accentBgColor: '#EFF0F2',
  darkColorSolid: '#90959D',
  contentColorSolid: '#3C4149',
  accentColorSolid: '#282A30',
  captionColorSolid: '#131416',

  // Scrollbar
  scrollbarBar: '#E0E0E0',
  scrollbarBarHover: '#90959D',

  // Input / editbox
  editboxFocusBorder: '#5190EC',

  // Toggle
  toggleBgColor: 'rgba(120, 120, 128, 0.32)',
  toggleOnBgColor: '#205DC2',

  // Status
  errorColor: '#EB5757',
  urgentColor: '#F5694A',
  warningColor: '#F2994A',
  wonColor: '#34DB80',
  lostColor: '#EB5757',

  // Tooltip
  tooltipColor: '#FFFFFF',
  tooltipBg: '#444248',

  // Avatar
  avatarBgColor: '#E0E0E0',
  avatarBorderColor: 'transparent',

  // Misc
  inboxNotify: '#F47758',

  // Card
  cardShadowColor: 'rgba(0, 0, 0, 0.5)',
  cardOverlayColor: 'rgba(144, 149, 157, 0.4)',
} as const

export type ThemeColors = typeof darkColors
