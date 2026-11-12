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
      darkItemSelectedBg: 'rgba(56, 189, 248, 0.14)',
      darkItemHoverBg: 'rgba(255, 255, 255, 0.06)',
      darkItemSelectedColor: '#E0F2FE',
      itemBorderRadius: radius.md,
    },
    Card: { headerFontSize: 16 },
    Button: { primaryShadow: '0 1px 2px rgb(3 105 161 / 0.25)', fontWeight: 500 },
    Segmented: { itemSelectedBg: colors.surface },
    Table: { headerBg: '#F8FAFC', headerColor: colors.textSecondary, rowHoverBg: '#F0F7FC' },
  },
}
