import { useState, useRef } from 'react';
import { Modal, Form, Input, Button, Avatar, Upload, message, Tabs, Divider, ConfigProvider } from 'antd';
import { UserOutlined, CameraOutlined, LockOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { userApi } from '../services/userApi';
import type { UploadChangeParam, UploadFile } from 'antd/es/upload';
import './ProfileModal.css';

export interface UserSession {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
  nickname?: string | null;
  bio?: string | null;
}

export interface ProfileModalProps {
  open: boolean;
  user: UserSession | null;
  onClose: () => void;
  onUpdated: (updated: Partial<UserSession>) => void;
}

function compressImage(file: File, maxW = 256, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(maxW / img.width, maxW / img.height, 1);
        const canvas = document.createElement('canvas');
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ProfileModal({ open, user, onClose, onUpdated }: ProfileModalProps) {
  const [loading, setLoading] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const avatarFileRef = useRef<File | null>(null);
  const [profileForm] = Form.useForm();
  const [pwdForm] = Form.useForm();

  const handleAvatarChange = async (info: UploadChangeParam<UploadFile>) => {
    const file = info.file.originFileObj;
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setAvatarPreview(compressed);
      avatarFileRef.current = file;
    } catch {
      message.error('图片处理失败，请重试');
    }
  };

  const handleProfileSave = async (values: { nickname: string; bio: string }) => {
    setLoading(true);
    try {
      let avatarUrl: string | undefined;
      if (avatarFileRef.current) {
        const res = await userApi.uploadAvatar(avatarFileRef.current);
        avatarUrl = res.avatarUrl;
      }
      await userApi.updateExtendedProfile({
        nickname: values.nickname,
        bio: values.bio,
        ...(avatarUrl ? { avatar: avatarUrl } : {}),
      });
      message.success('资料已更新');
      onUpdated({
        nickname: values.nickname,
        bio: values.bio,
        ...(avatarUrl ? { avatar: avatarUrl } : {}),
      });
      avatarFileRef.current = null;
    } catch (err) {
      message.error(err instanceof Error ? err.message : '更新失败');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values: { oldPassword: string; newPassword: string; confirmPassword: string }) => {
    if (values.newPassword !== values.confirmPassword) {
      message.error('两次输入的新密码不一致');
      return;
    }
    setPwdLoading(true);
    try {
      await userApi.changePassword(values.oldPassword, values.newPassword);
      message.success('密码已修改，请重新登录');
      pwdForm.resetFields();
      onClose();
    } catch (err) {
      message.error(err instanceof Error ? err.message : '密码修改失败');
    } finally {
      setPwdLoading(false);
    }
  };

  const currentAvatar = avatarPreview || user?.avatar;

  const profileTab = (
    <Form
      form={profileForm}
      layout="vertical"
      requiredMark={false}
      initialValues={{ nickname: user?.nickname || '', bio: user?.bio || '' }}
      onFinish={handleProfileSave}
    >
      {/* 头像 */}
      <div className="profile-avatar-section">
        <Avatar
          src={currentAvatar}
          icon={!currentAvatar ? <UserOutlined /> : undefined}
          size={80}
          style={{ background: '#2563eb' }}
        />
        <Upload
          accept="image/*"
          showUploadList={false}
          beforeUpload={() => false}
          onChange={handleAvatarChange}
        >
          <Button icon={<CameraOutlined />} size="small" className="profile-avatar-btn">
            更换头像
          </Button>
        </Upload>
        <p className="profile-avatar-hint">支持 JPG/PNG，自动压缩至 256×256</p>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      <Form.Item label="用户名">
        <Input value={user?.username} disabled />
      </Form.Item>
      <Form.Item label="邮箱">
        <Input value={user?.email} disabled />
      </Form.Item>
      <Form.Item name="nickname" label="昵称" rules={[{ max: 20, message: '昵称最多20字' }]}>
        <Input placeholder="设置一个昵称" maxLength={20} />
      </Form.Item>
      <Form.Item name="bio" label="个人简介" rules={[{ max: 200, message: '简介最多200字' }]}>
        <Input.TextArea placeholder="介绍一下自己吧…" maxLength={200} rows={3} showCount />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={loading} block>
          保存修改
        </Button>
      </Form.Item>
    </Form>
  );

  const passwordTab = (
    <Form form={pwdForm} layout="vertical" requiredMark={false} onFinish={handleChangePassword}>
      <Form.Item name="oldPassword" label="当前密码" rules={[{ required: true, message: '请输入当前密码' }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="请输入当前密码" />
      </Form.Item>
      <Form.Item
        name="newPassword"
        label="新密码"
        rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '新密码至少6位' }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="至少 6 位" />
      </Form.Item>
      <Form.Item name="confirmPassword" label="确认新密码" rules={[{ required: true, message: '请确认新密码' }]}>
        <Input.Password prefix={<LockOutlined />} placeholder="再次输入新密码" />
      </Form.Item>
      <Form.Item style={{ marginBottom: 0 }}>
        <Button type="primary" htmlType="submit" loading={pwdLoading} block danger>
          修改密码
        </Button>
      </Form.Item>
    </Form>
  );

  const accountTab = (
    <div className="profile-account-section">
      <div className="profile-bound-item">
        <span>邮箱绑定</span>
        <span className="profile-bound-value">{user?.email || '未绑定'}</span>
      </div>
      <div className="profile-bound-item">
        <span>微信绑定</span>
        <span className="profile-bound-value profile-bound-todo">敬请期待</span>
      </div>
      <div className="profile-bound-item">
        <span>QQ 绑定</span>
        <span className="profile-bound-value profile-bound-todo">敬请期待</span>
      </div>
      <Divider />
      <div className="profile-danger-zone">
        <div className="profile-danger-title">
          <ExclamationCircleOutlined style={{ color: '#ef4444' }} />
          <span>危险操作</span>
        </div>
        <Button danger block disabled>
          注销账号（功能开发中）
        </Button>
      </div>
    </div>
  );

  return (
    <Modal
      open={open}
      title="个人设置"
      onCancel={onClose}
      footer={null}
      width={480}
      centered
      destroyOnClose
    >
      <ConfigProvider theme={{ token: { colorPrimary: '#2563eb' } }}>
        <Tabs
          items={[
            { key: 'profile', label: '基本资料', children: profileTab },
            { key: 'password', label: '修改密码', children: passwordTab },
            { key: 'account', label: '账号管理', children: accountTab },
          ]}
        />
      </ConfigProvider>
    </Modal>
  );
}
