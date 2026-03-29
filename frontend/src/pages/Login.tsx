import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, ReadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      // Using URLSearchParams because OAuth2PasswordRequestForm expects Form Data Content-Type
      const formData = new URLSearchParams();
      formData.append('username', values.email);
      formData.append('password', values.password);

      const response = await fetch('http://localhost:8000/auth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Login failed');
      }

      const data = await response.json();
      login(data.access_token, values.email, data.name || 'User', data.delivery_time || '08:00', data.feeds || []);
      message.success(`Welcome back to Briefr, ${data.name || 'User'}!`);
      navigate('/');
    } catch (error: any) {
      message.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0b0a15' }}>
      <Card
        style={{ width: 400, borderRadius: 16, background: '#161625', border: '1px solid #2a2a4a' }}
        bodyStyle={{ padding: '40px' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <ReadOutlined style={{ fontSize: '48px', color: '#6c63ff', marginBottom: 16 }} />
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Log In to Briefr</Title>
          <Text type="secondary">Access your personalized daily digest</Text>
        </div>

        <Form
          name="login_form"
          layout="vertical"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Please input your Email!' }, { type: 'email', message: 'Invalid email' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#6c63ff' }} />} placeholder="Email Address" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#6c63ff' }} />} placeholder="Password" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" loading={loading} block style={{ borderRadius: 8 }}>
              Log in
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary">Don't have an account? </Text>
            <a onClick={() => navigate('/register')} style={{ color: '#00d4aa' }}>Sign up securely</a>
          </div>
        </Form>
      </Card>
    </div>
  );
}
