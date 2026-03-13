import type { ThemeConfig } from 'antd';

export const lightTheme: ThemeConfig = {
  token: {
    colorPrimary: '#000000',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',
    colorBgLayout: '#F7F5F2',
    colorText: '#1A1815',
    colorTextSecondary: '#6B6560',
    colorBorder: '#E0DCD7',
    borderRadius: 20,
    fontFamily: "'Outfit', sans-serif",
  },
  components: {
    Button: {
      borderRadius: 20,
      controlHeight: 36,
    },
    Input: {
      borderRadius: 20,
      controlHeight: 36,
    },
    Select: {
      borderRadius: 20,
      controlHeight: 36,
    },
    Menu: {
      itemSelectedColor: '#3B82F6',
      itemSelectedBg: '#E6F0FF',
      itemColor: '#1A1815',
      itemHoverColor: '#3B82F6',
    },
    Modal: {
      borderRadius: 20,
    },
  },
};

export const darkTheme: ThemeConfig = {
  token: {
    colorPrimary: '#3B82F6',
    colorBgContainer: '#1A1A1A',
    colorBgElevated: '#1A1A1A',
    colorBgLayout: '#181E25',
    colorText: '#F0F0F0',
    colorTextSecondary: '#A0A0A0',
    colorBorder: '#333333',
    borderRadius: 20,
    fontFamily: "'Outfit', sans-serif",
  },
  components: {
    Button: {
      borderRadius: 20,
      controlHeight: 36,
      colorPrimary: '#3B82F6',
    },
    Input: {
      borderRadius: 20,
      controlHeight: 36,
    },
    Select: {
      borderRadius: 20,
      controlHeight: 36,
    },
    Menu: {
      itemSelectedColor: '#3B82F6',
      itemSelectedBg: '#1F3A5F',
      itemColor: '#F0F0F0',
      itemHoverColor: '#3B82F6',
    },
    Modal: {
      borderRadius: 20,
    },
  },
};
