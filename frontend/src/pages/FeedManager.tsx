import { Typography, Card, Form, Input, Select, Button, Table, Switch, Space, Tag, message, Row, Col, Tabs } from 'antd';
import { ClockCircleOutlined, SaveOutlined, DeleteOutlined, PlusOutlined, LinkOutlined, SearchOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../api/config';
import { useState } from 'react';

const { Title, Text } = Typography;

const CATEGORY_COLORS: Record<string, string> = {
  'Tech': 'purple',
  'World': 'blue',
  'Science': 'cyan',
  'Business': 'gold',
  'Sports': 'green',
  'Entertainment': 'magenta',
  'Others': 'orange'
};

const FEATURED_SOURCES = [
  // Tech
  { label: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'Tech' },
  { label: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'Tech' },
  { label: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'Tech' },
  { label: 'Ars Technica', url: 'https://arstechnica.com/feed', category: 'Tech' },
  { label: 'Engadget', url: 'https://www.engadget.com/rss.xml', category: 'Tech' },
  
  // World
  { label: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'World' },
  { label: 'The Guardian', url: 'https://www.theguardian.com/international/rss', category: 'World' },
  { label: 'The Atlantic', url: 'https://www.theatlantic.com/feed/all/', category: 'World' },
  { label: 'AP News', url: 'https://apnews.com/feed', category: 'World' },
  { label: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', category: 'World' },

  // Science
  { label: 'NASA', url: 'https://www.nasa.gov/feed/', category: 'Science' },
  { label: 'SciAm', url: 'https://www.scientificamerican.com/platform/syndication/rss/', category: 'Science' },
  { label: 'Nature', url: 'https://www.nature.com/nature.rss', category: 'Science' },
  { label: 'Space.com', url: 'https://www.space.com/feeds/all', category: 'Science' },
  { label: 'Popular Science', url: 'https://www.popsci.com/feed/', category: 'Science' },

  // Business
  { label: 'WSJ Business', url: 'https://feeds.a.dj.com/rss/WSJcomUSBusiness.xml', category: 'Business' },
  { label: 'Forbes', url: 'https://www.forbes.com/business/feed/', category: 'Business' },
  { label: 'Fortune', url: 'https://fortune.com/feed/', category: 'Business' },
  { label: 'CNN Business', url: 'http://rss.cnn.com/rss/money_latest.rss', category: 'Business' },
  { label: 'Business Insider', url: 'https://www.businessinsider.com/rss', category: 'Business' },

  // Sports
  { label: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml', category: 'Sports' },
  { label: 'Sky Sports', url: 'https://skysports.com/rss/12040', category: 'Sports' },
  { label: 'Yahoo Sports', url: 'https://sports.yahoo.com/rss/', category: 'Sports' },
  { label: 'CNN Sports', url: 'http://rss.cnn.com/rss/edition_sport.rss', category: 'Sports' },
  { label: 'NBC Sports', url: 'https://www.nbcsports.com/feed/', category: 'Sports' },

  // Entertainment
  { label: 'Variety', url: 'https://variety.com/feed/', category: 'Entertainment' },
  { label: 'Hollywood Reporter', url: 'https://www.hollywoodreporter.com/feed/', category: 'Entertainment' },
  { label: 'Rolling Stone', url: 'https://www.rollingstone.com/feed/', category: 'Entertainment' },
  { label: 'Billboard', url: 'https://www.billboard.com/feed/', category: 'Entertainment' },
  { label: 'BBC Ent', url: 'http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', category: 'Entertainment' },

  // Others
  { label: 'Lifehacker', url: 'https://lifehacker.com/rss', category: 'Others' },
  { label: 'How-To Geek', url: 'https://www.howtogeek.com/feed/', category: 'Others' },
  { label: 'Daily Beast', url: 'https://www.thedailybeast.com/feed', category: 'Others' },
  { label: 'Mashable', url: 'https://mashable.com/feeds/rss/all', category: 'Others' },
  { label: 'Gizmodo', url: 'https://gizmodo.com/rss', category: 'Others' }
];

const CATEGORIES = ['Tech', 'World', 'Science', 'Business', 'Sports', 'Entertainment', 'Others'];

export default function FeedManager() {
  const { token, deliveryTime, updateDeliveryTime, feeds, updateFeeds } = useAuth();
  const [savingTime, setSavingTime] = useState(false);
  const [localTime, setLocalTime] = useState(deliveryTime);
  const [addingFeed, setAddingFeed] = useState(false);
  const [activeTab, setActiveTab] = useState('Tech');
  const [form] = Form.useForm();

  const syncSettingsToCloud = async (newTime: string, newFeeds: any[]) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ delivery_time: newTime, feeds: newFeeds })
      });
      if (!response.ok) throw new Error('Failed to save settings');
      updateDeliveryTime(newTime);
      updateFeeds(newFeeds);
      return true;
    } catch (err: any) {
      message.error(err.message);
      return false;
    }
  };

  const handleSaveDeliveryTime = async () => {
    setSavingTime(true);
    const success = await syncSettingsToCloud(localTime, feeds);
    if (success) message.success('Delivery time updated!');
    setSavingTime(false);
  };

  const handleAddFeed = async (values: any) => {
    setAddingFeed(true);
    let feedUrl = values.url.trim();

    // Smart detection: if user typed a domain instead of a direct XML/RSS link, auto-discover it
    const isDirectFeed = feedUrl.includes('.xml') || feedUrl.includes('.rss') || feedUrl.includes('/feed') || feedUrl.includes('/rss');
    
    if (!isDirectFeed) {
      message.loading({ content: `Scanning ${feedUrl} for RSS feeds...`, key: 'discover', duration: 0 });
      try {
        const resp = await fetch(`${API_BASE_URL}/tools/discover-feed?domain=${encodeURIComponent(feedUrl)}`);
        const data = await resp.json();
        if (data.found) {
          feedUrl = data.feed_url;
          message.success({ content: `Found: ${feedUrl}`, key: 'discover' });
        } else {
          message.error({ content: data.message || 'No RSS feed found on this website.', key: 'discover' });
          setAddingFeed(false);
          return;
        }
      } catch (err) {
        message.error({ content: 'Could not reach discovery service.', key: 'discover' });
        setAddingFeed(false);
        return;
      }
    }

    const newFeed = {
      id: Date.now().toString(),
      label: values.label,
      url: feedUrl,
      category: values.category,
      active: true,
      dateAdded: new Date().toISOString().substring(0, 10)
    };
    
    const updatedFeeds = [...feeds, newFeed];
    const success = await syncSettingsToCloud(localTime, updatedFeeds);
    if (success) {
      form.resetFields();
      message.success('Feed added successfully!');
    }
    setAddingFeed(false);
  };

  const handleAddFeaturedSource = async (source: any) => {
    // Check if feed already exists
    if (feeds.some((f: any) => f.url === source.url)) {
      message.warning(`${source.label} is already in your feed list.`);
      return;
    }

    const newFeed = {
      id: Date.now().toString(),
      label: source.label,
      url: source.url,
      category: source.category,
      active: true,
      dateAdded: new Date().toISOString().substring(0, 10)
    };
    
    const updatedFeeds = [...feeds, newFeed];
    const success = await syncSettingsToCloud(localTime, updatedFeeds);
    if (success) {
      message.success(`${source.label} added successfully!`);
    }
  };

  const handleToggleFeed = async (id: string, active: boolean) => {
    const updatedFeeds = feeds.map(f => f.id === id ? { ...f, active } : f);
    const success = await syncSettingsToCloud(localTime, updatedFeeds);
    if (success) message.success(`Feed ${active ? 'activated' : 'deactivated'} successfully.`);
  };

  const handleDeleteFeed = async (id: string) => {
    const updatedFeeds = feeds.filter(f => f.id !== id);
    const success = await syncSettingsToCloud(localTime, updatedFeeds);
    if (success) message.success('Source removed.');
  };

  const columns = [
    {
      title: 'Active',
      dataIndex: 'active',
      key: 'active',
      render: (active: boolean, record: any) => (
        <Switch checked={active} onChange={(checked) => handleToggleFeed(record.id, checked)} />
      )
    },
    {
      title: 'Label',
      dataIndex: 'label',
      key: 'label',
      render: (text: string) => <Text strong>{text}</Text>
    },
    {
      title: 'RSS URL',
      dataIndex: 'url',
      key: 'url',
      render: (text: string) => <Text type="secondary" ellipsis style={{ maxWidth: 300, display: 'inline-block' }}><LinkOutlined style={{ marginRight: 6 }}/>{text}</Text>
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat: string) => <Tag color={CATEGORY_COLORS[cat] || 'default'}>{cat || 'General'}</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: any) => (
        <Space size="middle">
          <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDeleteFeed(record.id)} />
        </Space>
      )
    }
  ];

  // Generate 24 user-friendly Hourly Select Options (Timezone Aware)
  const timeOptions = Array.from({ length: 24 }).map((_, i) => {
    // i represents the Local Hour (0 to 23)
    const localHour = i;
    
    // Calculate the UTC equivalent hour to store in the database
    const offsetHours = Math.round(new Date().getTimezoneOffset() / 60);
    const utcHour = (localHour + offsetHours + 24) % 24;
    const utcValue = `${utcHour.toString().padStart(2, '0')}:00`;
    
    const ampm = localHour >= 12 ? 'PM' : 'AM';
    const displayHour = localHour % 12 === 0 ? 12 : localHour % 12;
    
    let tagText, color;
    if (localHour >= 5 && localHour < 12) {
      tagText = 'Morning'; color = 'gold';
    } else if (i >= 12 && i < 17) {
      tagText = 'Afternoon'; color = 'orange';
    } else if (i >= 17 && i < 21) {
      tagText = 'Evening'; color = 'volcano';
    } else {
      tagText = 'Night'; color = 'purple';
    }

    return {
      value: utcValue,
      label: (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{displayHour}:00 {ampm}</span>
          <Tag color={color} bordered={false} style={{ margin: 0, borderRadius: 10, fontSize: 10 }}>{tagText}</Tag>
        </div>
      )
    };
  });

  return (
    <div className="page-container">
      <div style={{ marginBottom: '40px' }}>
        <Title level={2} style={{ margin: 0 }}>Feed Manager & Settings</Title>
        <Text type="secondary" style={{ fontSize: '16px' }}>Configure the RSS sources and delivery schedule that power your daily digest.</Text>
      </div>

      {/* Settings Block */}
      <Card bordered={true} style={{ marginBottom: '40px', background: '#1a1a2e' }}>
        <Title level={4} style={{ marginTop: 0, marginBottom: '24px' }}>
          <ClockCircleOutlined style={{ marginRight: 8, color: '#6c63ff' }}/> Smart Scheduler
        </Title>
        <Space size="large" align="center">
          <div style={{ minWidth: 260 }}>
            <Text style={{ display: 'block', marginBottom: 8, color: '#94a3b8' }}>Preferred Delivery Time (UTC)</Text>
            <Select 
              value={localTime} 
              onChange={setLocalTime} 
              style={{ width: '100%' }} 
              size="large"
              options={timeOptions}
              dropdownStyle={{ background: '#1a1a2e', borderRadius: 12, padding: 8 }}
            />
          </div>
          <div style={{ marginTop: 28 }}>
            <Button 
              type="primary" 
              icon={<SaveOutlined />} 
              size="large" 
              loading={savingTime}
              onClick={handleSaveDeliveryTime}
              disabled={localTime === deliveryTime}
            >
              Save Schedule
            </Button>
          </div>
        </Space>
      </Card>

      {/* Discover Featured Sources */}
      <div style={{ marginBottom: '40px' }}>
        <Title level={4} style={{ marginBottom: '16px' }}>Discover Featured Sources</Title>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          className="custom-briefr-tabs"
          items={CATEGORIES.map(category => ({
            key: category,
            label: category,
            children: (
              <Row gutter={[12, 12]} style={{ marginTop: '20px', flexWrap: 'wrap' }}>
                {FEATURED_SOURCES.filter(s => s.category === category).map((source) => (
                  <Col xs={24} sm={12} md={8} lg={4} xl={4} style={{ flex: '0 0 20%', maxWidth: '20%' }} key={source.url}>
                    <Card 
                      hoverable 
                      size="small"
                      style={{ 
                        background: '#1a1a2e', 
                        borderColor: '#2a2a4a', 
                        textAlign: 'center',
                        borderRadius: '12px',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        padding: '16px 0',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}
                      onClick={() => handleAddFeaturedSource(source)}
                    >
                      <Text strong style={{ display: 'block', fontSize: '15px', color: '#f1f5f9', marginBottom: '8px' }}>
                        {source.label}
                      </Text>
                      <Tag color={CATEGORY_COLORS[source.category]} style={{ margin: '0 auto', pointerEvents: 'none', borderRadius: '4px', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px' }}>
                        {source.category}
                      </Tag>
                      <div style={{ marginTop: '16px', borderTop: '1px solid #2a2a4a', paddingTop: '12px' }}>
                         <Button type="link" size="small" style={{ color: '#00d4aa', fontWeight: 600 }}>+ Add to Reader</Button>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )
          }))}
        />
      </div>

      {/* Add New Feed Component */}
      <Card bordered={true} style={{ marginBottom: '40px', background: '#1a1a2e' }}>
        <Title level={4} style={{ marginTop: 0, marginBottom: '8px' }}><SearchOutlined style={{ marginRight: 8, color: '#00d4aa' }} />Add Content Source</Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: '24px' }}>
          Just type a website name like <b>wired.com</b> or <b>techcrunch.com</b> — we'll automatically find the right RSS feed for you.
        </Text>
        <Form form={form} layout="inline" onFinish={handleAddFeed} style={{ width: '100%', flexWrap: 'nowrap' }}>
          <Form.Item name="url" style={{ flexGrow: 1 }} rules={[{ required: true, message: 'Enter a website or RSS link' }]}>
            <Input placeholder="Website (e.g. wired.com) or direct RSS link" size="large" />
          </Form.Item>
          
          <Form.Item name="label" rules={[{ required: true, message: 'Give it a name' }]}>
            <Input placeholder="Source Name" size="large" />
          </Form.Item>

          <Form.Item name="category" rules={[{ required: true, message: 'Pick a category' }]}>
            <Select placeholder="Category" size="large" style={{ width: 140 }}>
              {Object.keys(CATEGORY_COLORS).map(cat => (
                <Select.Option key={cat} value={cat}>{cat}</Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item style={{ marginRight: 0 }}>
            <Button type="primary" size="large" icon={<PlusOutlined />} htmlType="submit" loading={addingFeed}>
              Add Feed
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Feed Table List */}
      <Title level={4} style={{ marginBottom: '16px' }}>Your Active Sources ({feeds.length})</Title>
      
      <Table 
        dataSource={feeds} 
        columns={columns} 
        rowKey="id" 
        pagination={false}
        style={{ marginBottom: '32px' }}
      />
    </div>
  );
}
