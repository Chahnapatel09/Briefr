import { useState, useEffect } from 'react';
import { Typography, Row, Col, Tabs, Button, Breadcrumb, Space, Spin, message } from 'antd';
import { DownloadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { digestsApi } from '../api/digests';
import StoryCard from '../components/StoryCard';

const { Title, Text } = Typography;

export default function DigestDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { token } = useAuth();
  
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState('All');
  const [parsedStories, setParsedStories] = useState<any[]>([]);

  useEffect(() => {
    const fetchDigestHtml = async () => {
      if (!token || !id) return;
      try {
        const data = await digestsApi.fetchRawHtml(token, id);
        setHtmlContent(data);
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(data, 'text/html');
        const extracted = Array.from(doc.querySelectorAll('.story')).map((el, index) => {
          const rawTitle = el.querySelector('h2 a')?.textContent || 'Untitled';
          let source = el.getAttribute('data-source') || 'News Source';
          let cleanTitle = rawTitle;
          
          const match = rawTitle.match(/^\[(.*?)\]\s*(.*)$/);
          if (match) {
            source = el.getAttribute('data-source') || match[1];
            cleanTitle = match[2];
          }

          return {
            id: index.toString(),
            source: source,
            category: el.getAttribute('data-category') || 'News',
            title: cleanTitle,
            summary: el.querySelector('p')?.textContent || '',
            imageUrl: `https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?crop=entropy&auto=format&fit=crop&w=400&q=80`,
            readTime: '3 min read',
            link: el.querySelector('h2 a')?.getAttribute('href') || '#'
          };
        });
        setParsedStories(extracted);
      } catch (err) {
        message.error("Failed to load digest. Access may be restricted.");
        navigate('/archive');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDigestHtml();
  }, [id, token, navigate]);

  const handleDownloadPdf = () => {
    const iframe = document.getElementById('print-iframe') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } else {
      window.print();
    }
  };

  if (isLoading) {
    return (
      <div className="page-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Loading your curated digest..." />
      </div>
    );
  }

  return (
    <div className="print-container page-container" style={{ paddingBottom: '100px' }}>
      
      {/* Breadcrumb & Navigation */}
      <Breadcrumb style={{ marginBottom: '24px' }}>
        <Breadcrumb.Item onClick={() => navigate('/archive')} style={{ cursor: 'pointer', color: '#94a3b8' }}>Archive</Breadcrumb.Item>
        <Breadcrumb.Item>
          <Text style={{ color: '#fff' }}>Daily Digest</Text>
        </Breadcrumb.Item>
      </Breadcrumb>

      {/* Metadata Bar */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '40px' }}>
        <div>
          <Title style={{ margin: 0, fontSize: '36px', fontWeight: 800 }}>Personalized Digital Feed</Title>
          <Space size="large" style={{ marginTop: '8px' }}>
            <Text type="secondary">Curated specifically for you</Text>
            <Text type="secondary">•</Text>
            <Text type="secondary">Sourced from top publishers</Text>
          </Space>
        </div>
        <Button className="no-print" type="primary" size="large" icon={<DownloadOutlined />} onClick={handleDownloadPdf}>Download PDF</Button>
      </div>

      {/* Filters */}
      <div className="no-print">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          className="custom-briefr-tabs"
          items={['All', 'Tech', 'World', 'Science', 'Business', 'Sports', 'Entertainment', 'Others'].map(c => ({ key: c, label: c }))}
          tabBarStyle={{ marginBottom: '32px', borderBottom: '1px solid #2a2a4a' }}
        />
      </div>

      {/* Historical Story Grid */}
      <Row gutter={[24, 24]} style={{ marginBottom: '40px' }}>
        {parsedStories
          .filter(story => activeTab === 'All' || story.category.toLowerCase() === activeTab.toLowerCase())
          .map(story => (
            <Col xs={24} sm={12} lg={8} key={story.id} style={{ display: 'flex' }}>
              <div style={{ width: '100%' }}>
                <StoryCard {...story} />
              </div>
            </Col>
          ))}
      </Row>

      {/* Hidden Embedded S3 HTML Sandbox purely for perfect PDF generation without breaking React CSS */}
      <iframe 
         id="print-iframe"
         srcDoc={htmlContent || undefined} 
         style={{ width: '0', height: '0', border: 'none', position: 'absolute' }}
         title="Print Document"
      />

      <Button className="no-print" icon={<ArrowLeftOutlined />} onClick={() => navigate('/archive')} size="large">
        Back to Archive
      </Button>
    </div>
  );
}
