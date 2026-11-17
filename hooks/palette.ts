// Written by tools/make-palette.mjs: change the numbers there and run it again,
// rather than editing a color here.
//
// A snowy day in light mode and a clear winter night in dark mode. Every gray leans
// to one cold blue, and each pair of colors keeps the contrast the design system
// gives it, so makeColors lists no problem for this palette.

import type { makeColors } from './make-colors.js'

export const WINTER: Parameters<typeof makeColors>[0] = {
  label: 'Winter',
  light: {
    gray: { stops: {
      0: '#edf4fb', 10: '#eaf0f8', 20: '#e6eef6', 30: '#e4ebf4', 40: '#e0e8f2', 50: '#dbe5ef',
      60: '#d8e1ed', 70: '#d5dfea', 80: '#d1dce9', 90: '#cedae6', 100: '#cbd7e4', 150: '#bac7d7',
      200: '#abbaca', 250: '#9cabbc', 300: '#8c9daf', 350: '#7e8ea1', 400: '#708194', 450: '#637487',
      500: '#556578', 550: '#49596b', 600: '#3c4b5d', 650: '#303e4f', 700: '#283645', 750: '#202c3b',
      800: '#15212d', 810: '#131f2b', 820: '#121d29', 830: '#101a27', 840: '#0e1824', 850: '#0b1621',
      860: '#0a131e', 870: '#08121c', 880: '#07101a', 890: '#060d17', 900: '#02070f',
    } },
    roles: {
      accent: { stops: {
        50: '#dee5eb', 100: '#c7d7e7', 250: '#85aed0', 300: '#6fa1c9', 400: '#3f83bc', 450: '#3175ad',
        600: '#1a4b75', 700: '#103655', 800: '#082136', 850: '#061724',
      } },
      danger: { stops: {
        100: '#eccccc', 250: '#e18e8f', 300: '#dd797a', 400: '#d24847', 450: '#c03c3a', 600: '#812524',
        700: '#5e1b19', 800: '#391110',
      } },
      success: { stops: {
        100: '#c8dbd2', 250: '#82baa3', 400: '#4d9a7d', 450: '#438b70', 600: '#235744', 700: '#193d30',
        800: '#16241e',
      } },
      warning: { stops: {
        100: '#ead2a0', 200: '#e7ac2b', 250: '#db9c1d', 300: '#c98e19', 600: '#674102', 700: '#4b2d03',
        800: '#2e1b02',
      } },
      pro: { stops: {
        100: '#d6d1e4', 250: '#ada0cd', 300: '#9e91c3', 400: '#8271b3', 450: '#7361ac', 600: '#4b3b7a',
        700: '#362b59', 800: '#211937',
      } },
    },
    git: { added: '#049331', removed: '#c4124d', modified: '#907913', merged: '#8763d1', closed: '#f52e27', conflicting: '#bd5a0d', draft: '#6c6c6b' },
  },
  dark: {
    gray: { stops: {
      0: '#feffff', 10: '#fafcff', 20: '#f6f9fe', 30: '#f2f6fc', 40: '#edf4fb', 50: '#f0f5fc',
      60: '#e5edf5', 70: '#e2eaf3', 80: '#dfe7f1', 90: '#dbe5ef', 100: '#d8e1ed', 150: '#ccd7e5',
      200: '#c0cddb', 250: '#b1becf', 300: '#a0afc0', 350: '#909fb2', 400: '#8192a4', 450: '#738396',
      500: '#647488', 550: '#56677a', 600: '#4a5a6c', 650: '#3d4c5e', 700: '#324051', 750: '#273544',
      800: '#1e2a38', 810: '#1c2837', 820: '#1a2634', 830: '#182532', 840: '#182431', 850: '#15212d',
      860: '#141f2c', 870: '#121e2a', 880: '#121d29', 890: '#111b28', 900: '#0f1a26',
    } },
    roles: {
      accent: { stops: {
        50: '#e9f0f6', 100: '#d1e3f3', 250: '#98c2e4', 300: '#80b2dc', 400: '#4287bf', 450: '#3479b1',
        600: '#2a5b85', 700: '#1c4061', 800: '#112b40', 850: '#102230',
      } },
      danger: { stops: {
        100: '#f9d8d7', 250: '#f6a2a1', 300: '#f18b8b', 400: '#db524f', 450: '#c84442', 600: '#913432',
        700: '#692623', 800: '#441a19',
      } },
      success: { stops: {
        100: '#d2e7dd', 250: '#95cdb6', 400: '#56a486', 450: '#4b9378', 600: '#326551', 700: '#26483b',
        800: '#1f2e27',
      } },
      warning: { stops: {
        100: '#f6deaa', 200: '#fcbf46', 250: '#efae3a', 300: '#dda035', 600: '#764e17', 700: '#563710',
        800: '#39240a',
      } },
      pro: { stops: {
        100: '#e3dcf1', 250: '#c1b3e1', 300: '#b1a3d6', 400: '#8a78bb', 450: '#7b68b3', 600: '#584989',
        700: '#3f3564', 800: '#292342',
      } },
    },
    git: { added: '#41e156', removed: '#fb5b6c', modified: '#ffd546', merged: '#bfa3fe', closed: '#fe786e', conflicting: '#fd924c', draft: '#b2b2b1' },
  },
}
