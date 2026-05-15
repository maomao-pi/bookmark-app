import { Avatar } from 'antd';
import type { AvatarProps } from 'antd';
import { getAvatarColor, getAvatarInitials, resolveUserAvatarSrc } from '../utils/userAvatar';

export interface UserAvatarProps extends Omit<AvatarProps, 'src' | 'icon'> {
  avatar?: string | null;
  name: string;
}

/** 有自定义头像时仅展示图片；否则展示「背景色 + 姓名缩写」默认头像 */
export function UserAvatar({ avatar, name, size, className, style, ...rest }: UserAvatarProps) {
  const src = resolveUserAvatarSrc(avatar);
  const displayName = name.trim() || '?';

  if (src) {
    return (
      <Avatar
        size={size}
        src={src}
        className={className}
        style={{ background: 'transparent', ...style }}
        {...rest}
      />
    );
  }

  return (
    <Avatar
      size={size}
      className={className}
      style={{
        backgroundColor: getAvatarColor(displayName),
        color: '#fff',
        fontWeight: 600,
        flexShrink: 0,
        ...style,
      }}
      {...rest}
    >
      {getAvatarInitials(displayName)}
    </Avatar>
  );
}
