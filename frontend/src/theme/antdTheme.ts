import { theme as antdAlgorithm, type ThemeConfig } from 'antd'
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

/**
 * Theme tối cho thẻ form kính mờ trên trang công khai (đăng nhập/đăng ký…): toàn trang một nền navy liền mạch
 * với cảnh 3D. ConfigProvider lồng nhau kế thừa token của cha → phải ghi đè rõ các token màu sáng.
 */
export const antdPublicDarkTheme: ThemeConfig = {
  algorithm: antdAlgorithm.darkAlgorithm,
  token: {
    colorPrimary: '#0EA5E9',
    colorLink: '#38BDF8',
    colorLinkHover: '#7DD3FC',
    colorText: '#F1F5F9',
    colorTextSecondary: '#CBD5E1',
    colorTextTertiary: '#94A3B8',
    colorTextPlaceholder: '#64748B',
    colorBorder: 'rgba(148, 163, 184, 0.28)',
    colorBorderSecondary: 'rgba(148, 163, 184, 0.18)',
    colorBgLayout: 'transparent',
    colorBgContainer: 'rgba(2, 6, 23, 0.55)',
    colorBgElevated: '#0F1B2D',
    colorFillAlter: 'rgba(148, 163, 184, 0.08)',
  },
  components: {
    Button: { primaryShadow: '0 6px 20px -6px rgb(14 165 233 / 0.6)', fontWeight: 500, defaultBg: 'rgba(255,255,255,0.06)' },
    Input: { activeShadow: '0 0 0 3px rgb(56 189 248 / 0.25)' },
  },
}
