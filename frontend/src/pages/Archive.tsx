import { useState, useEffect } from 'react';
import { Typography, Row, Col, Card, List, Tag, Badge, Button, Space, Spin } from 'antd';
import { FireFilled, RightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { digestsApi, type DigestMeta } from '../api/digests';

const { Title, Text } = Typography;

export default function Archive() {
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [digests, setDigests] = useState<DigestMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Calculate User Streak ---
  const calculateStreak = () => {
    if (!digests.length) return 0;
    const dates = digests.map(d => {
      try { return new Date(d.created_at + "Z").toISOString().substring(0, 10); } 
      catch { return ''; }
    }).filter(Boolean);
    const uniqueDates = Array.from(new Set(dates)).sort().reverse();
    
    let streak = 0;
    const today = new Date().toISOString().substring(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().substring(0, 10);
    
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;
    
    let checkDate = new Date(uniqueDates[0]);
    for (const dateStr of uniqueDates) {
      if (dateStr === checkDate.toISOString().substring(0, 10)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };
  const currentStreak = calculateStreak();

  useEffect(() => {
    const fetchArchive = async () => {
      if (!token) return;
      try {
        const data = await digestsApi.fetchAll(token);
        setDigests(data);
      } catch (err) {
        console.error("Archive sync failed:", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArchive();
  }, [token]);

  if (isLoading) {
    return (
      <div className="page-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Loading historical archives..." />
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header & Streak */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <Title level={2} style={{ margin: 0 }}>Digest Archive</Title>
        <Badge count={<div style={{ background: 'rgba(255, 100, 0, 0.2)', color: '#ff7a00', padding: '4px 12px', borderRadius: '16px', fontWeight: 'bold' }}><FireFilled /> {currentStreak} day streak</div>} />
      </div>

      {/* Stats Bar */}
      <Row gutter={16} style={{ marginBottom: '40px' }}>
        <Col span={12}>
          <Card bordered style={{ background: '#1a1a2e' }}>
            <Text type="secondary">Total Generated</Text>
            <Title level={3} style={{ margin: 0, marginTop: '8px' }}>{digests.length}</Title>
          </Card>
        </Col>
        <Col span={12}>
          <Card bordered style={{ background: '#1a1a2e' }}>
            <Text type="secondary">Total News Cards (Estimated)</Text>
            <Title level={3} style={{ margin: 0, marginTop: '8px' }}>{digests.length * 5}</Title>
          </Card>
        </Col>
      </Row>

      {/* Digest List */}
      <List
        itemLayout="horizontal"
        dataSource={digests}
        pagination={{ pageSize: 8, style: { textAlign: 'center', marginTop: '32px' } }}
        renderItem={item => {
          // Format Date and Time precisely
          let formattedDate = item.created_at.substring(0, 10);
          let formattedTime = "";
          try {
            const dateObj = new Date(item.created_at + "Z");
            formattedDate = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
            formattedTime = dateObj.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
          } catch (e) {}
          
          return (
          <Card style={{ marginBottom: '16px', background: '#1a1a2e' }} bodyStyle={{ padding: '20px' }}>
            <Row align="middle" justify="space-between">
              
              <Col span={12}>
                <Text type="secondary" style={{ display: 'block', fontSize: '13px', marginBottom: '4px' }}>
                  Generated on
                </Text>
                <Text strong style={{ fontSize: '16px' }}>
                  {formattedDate} at {formattedTime}
                </Text>
              </Col>
              
              <Col span={4}>
                <Tag color="purple">News Digest</Tag>
              </Col>
              
              <Col span={4}>
                <Badge count="Personalized" style={{ backgroundColor: '#2a2a4a', color: '#fff' }} />
              </Col>
              
              <Col span={4} style={{ textAlign: 'right' }}>
                <Space>
                  <Button type="primary" onClick={() => navigate(`/archive/${item.digest_id}`)}>
                    Read <RightOutlined />
                  </Button>
                </Space>
              </Col>
              
            </Row>
          </Card>
          );
        }}
      />
    </div>
  );
}
