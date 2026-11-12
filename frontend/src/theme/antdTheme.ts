import type { ThemeConfig } from 'antd'
import { colors, fontFamily, radius } from './tokens'

/** Ánh xạ token RepairFlow sang theme AntD. */
export const antdTheme: ThemeConfig = {
  cssVar: { prefix: 'ant' },
  token: {
    colorPrimary: colors.primary,
    colorLink: colors.primary,
    colorLinkHover: colors.primaryHover,
    colorSuccess: colors.success,
    colorWarning: colors.warning,
    colorError: colors.error,
    colorInfo: colors.info,
    colorText: colors.text,
    colorTextSecondary: colors.textSecondary,
    colorTextTertiary: colors.textMuted,
    colorBorder: colors.border,
    colorBorderSecondary: colors.border,
    colorBgLayout: colors.bg,
    colorBgContainer: colors.surface,
    fontFamily,
    fontSize: 14,
    borderRadius: radius.md,
    borderRadiusSM: radius.sm,
    borderRadiusLG: radius.lg,
    controlHeight: 36,
    motionDurationMid: '0.2s',
  },
  components: {
    Layout: { headerBg: colors.surface, headerHeight: 64, headerPadding: '0 24px', siderBg: colors.sidebarBg, bodyBg: colors.bg },
    Menu: {
      darkItemBg: colors.sidebarBg,
      darkSubMenuItemBg: colors.sidebarBg,
      darkItemColor: colors.sidebarText,
      darkItemSelectedBg: colors.primary,
      darkItemSelectedColor: colors.sidebarTextActive,
      itemBorderRadius: radius.md,
    },
    Card: { headerFontSize: 16 },
    Table: { headerBg: '#F1F5F9', headerColor: colors.textSecondary },
  },
}
