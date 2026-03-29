import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message } from 'antd';
import { UserOutlined, LockOutlined, ReadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

export default function Register() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: values.email, password: values.password, name: values.name }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Registration failed');
      }

      message.success('Account created successfully! Please log in.');
      navigate('/login');
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
          <ReadOutlined style={{ fontSize: '48px', color: '#00d4aa', marginBottom: 16 }} />
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>Join Briefr</Title>
          <Text type="secondary">Create your custom daily digest</Text>
        </div>

        <Form
          name="register_form"
          layout="vertical"
          onFinish={onFinish}
          size="large"
        >
          <Form.Item
            name="name"
            rules={[{ required: true, message: 'Please input your Full Name!' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#00d4aa' }} />} placeholder="Full Name" />
          </Form.Item>

          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Please input your Email!' }, { type: 'email', message: 'Invalid email' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#00d4aa' }} />} placeholder="Email Address" />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your Password!' }, { min: 8, message: 'Password must be at least 8 characters' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#00d4aa' }} />} placeholder="Secure Password" />
          </Form.Item>

          <Form.Item style={{ marginTop: 24 }}>
            <Button style={{ background: '#00d4aa', color: '#0b0a15', borderRadius: 8, fontWeight: 600, border: 'none' }} htmlType="submit" loading={loading} block>
              Create Account
            </Button>
          </Form.Item>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Text type="secondary">Already have an account? </Text>
            <a onClick={() => navigate('/login')} style={{ color: '#6c63ff' }}>Log in here</a>
          </div>
        </Form>
      </Card>
    </div>
  );
}
