import type { Config } from 'tailwindcss'
import {
  commonColors,
  darkColors,
  spacingPx,
  fontFamily,
  fontSize,
  lineHeight,
  radiiPx,
} from '@hcengineering/mobile-design-tokens'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Common / shared colors
        primary: {
          DEFAULT: commonColors.primaryButtonDefault,
          hover: commonColors.primaryButtonHovered,
          pressed: commonColors.primaryButtonPressed,
          outline: commonColors.primaryButtonOutline,
        },
        secondary: {
          DEFAULT: commonColors.secondaryButtonDefault,
          hover: commonColors.secondaryButtonHovered,
          pressed: commonColors.secondaryButtonPressed,
        },
        positive: {
          DEFAULT: commonColors.positiveDefault,
          hover: commonColors.positiveHovered,
          pressed: commonColors.positivePressed,
        },
        negative: {
          DEFAULT: commonColors.negativeDefault,
          hover: commonColors.negativeHovered,
          pressed: commonColors.negativePressed,
        },
        link: commonColors.linkColor,
        highlight: {
          blue: commonColors.highlightBlue,
          red: commonColors.highlightRed,
        },
        status: {
          active: commonColors.statusActive,
          dnd: commonColors.statusDnd,
          busy: commonColors.statusBusy,
          away: commonColors.statusAway,
        },
        error: commonColors.systemError,

        // Dark theme surface tokens (default)
        surface: darkColors.bgColor,
        'surface-back': darkColors.backColor,
        'surface-accent': darkColors.accentBgColor,
        'surface-overlay': darkColors.overlayColor,
        'surface-popup': darkColors.popupColor,
        'surface-popup-hover': darkColors.popupHover,
        'surface-panel': darkColors.panelColor,
        'surface-header': darkColors.compHeaderColor,
        'surface-divider': darkColors.bgDividerColor,
        'surface-list-row': darkColors.listRowColor,
        'surface-button': darkColors.buttonContainerColor,

        // Dark theme text tokens
        caption: darkColors.captionColor,
        content: darkColors.contentColor,
        dark: darkColors.darkColor,
        halfcontent: darkColors.halfcontentColor,
        darker: darkColors.darkerColor,
        trans: darkColors.transColor,

        // Dark theme interactive tokens
        'button-default': darkColors.buttonDefault,
        'button-hover': darkColors.buttonHovered,
        'button-pressed': darkColors.buttonPressed,
        'button-border': darkColors.buttonBorder,

        // Dark theme nav
        nav: {
          DEFAULT: darkColors.navpanelColor,
          hover: darkColors.navpanelHovered,
          selected: darkColors.navpanelSelected,
          divider: darkColors.navpanelDivider,
          icon: darkColors.navpanelIconsColor,
        },

        // Divider
        divider: darkColors.dividerColor,

        // Highlight
        'highlight-hover': darkColors.highlightHover,
        'highlight-select': darkColors.highlightSelect,
        'highlight-select-border': darkColors.highlightSelectBorder,
        'highlight-select-hover': darkColors.highlightSelectHover,

        // Status bar
        statusbar: darkColors.statusbarColor,

        // Tooltip
        tooltip: {
          DEFAULT: darkColors.tooltipColor,
          bg: darkColors.tooltipBg,
        },

        // Toggle
        toggle: {
          bg: darkColors.toggleBgColor,
          on: darkColors.toggleOnBgColor,
        },

        // Solid text accents
        'dark-solid': darkColors.darkColorSolid,
        'content-solid': darkColors.contentColorSolid,
        'accent-solid': darkColors.accentColorSolid,
        'caption-solid': darkColors.captionColorSolid,

        // Inbox
        notify: darkColors.inboxNotify,
      },
      spacing: spacingPx,
      borderRadius: radiiPx,
      fontFamily: {
        sans: [fontFamily.sans],
        'sans-medium': [fontFamily.sansMedium],
        'sans-semibold': [fontFamily.sansSemiBold],
        'sans-bold': [fontFamily.sansBold],
      },
      fontSize: {
        xs: [`${fontSize.xs}px`, { lineHeight: `${lineHeight.xs}px` }],
        sm: [`${fontSize.sm}px`, { lineHeight: `${lineHeight.sm}px` }],
        md: [`${fontSize.md}px`, { lineHeight: `${lineHeight.md}px` }],
        base: [`${fontSize.base}px`, { lineHeight: `${lineHeight.base}px` }],
        lg: [`${fontSize.lg}px`, { lineHeight: `${lineHeight.lg}px` }],
        xl: [`${fontSize.xl}px`, { lineHeight: `${lineHeight.xl}px` }],
        '2xl': [`${fontSize['2xl']}px`, { lineHeight: `${lineHeight['2xl']}px` }],
        '3xl': [`${fontSize['3xl']}px`, { lineHeight: `${lineHeight['3xl']}px` }],
      },
    },
  },
  plugins: [],
} satisfies Config
