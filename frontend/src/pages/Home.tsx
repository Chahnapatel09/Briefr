import { useState, useEffect } from 'react';
import { Typography, Row, Col, Tabs, Button, Spin, Empty, Space, message } from 'antd';
import { DownloadOutlined, ThunderboltOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { useAuth } from '../context/AuthContext';
import { digestsApi, type DigestMeta } from '../api/digests';
import StoryCard from '../components/StoryCard';

const { Title, Text, Paragraph } = Typography;

export default function Home() {
  const { token, userName } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [latestDigest, setLatestDigest] = useState<DigestMeta | null>(null);
  const [digestHtml, setDigestHtml] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState('All');
  const [parsedStories, setParsedStories] = useState<any[]>([]);

  // Format date for display
  const getFormattedDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + "Z");
      return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    } catch {
      return "Today";
    }
  };

  // Load the most recent digest and parse stories from its HTML
  const loadActiveDigest = async () => {
    if (!token) return;
    try {
      const allMetas = await digestsApi.fetchAll(token);
      if (allMetas.length > 0) {
        const topMeta = allMetas[0];
        setLatestDigest(topMeta);
        
        const rawContent = await digestsApi.fetchRawHtml(token, topMeta.digest_id);
        setDigestHtml(rawContent);

        // Parse the HTML into structured story objects
        const parser = new DOMParser();
        const doc = parser.parseFromString(rawContent, 'text/html');
        const extracted = Array.from(doc.querySelectorAll('.story')).map((el, index) => {
          const rawTitle = el.querySelector('h2 a')?.textContent || 'Untitled';
          let source = el.getAttribute('data-source') || 'News Source';
          let cleanTitle = rawTitle;
          
          const match = rawTitle.match(/^\[(.*?)\]\s*(.*)$/);
          if (match) {
            // Use data-source attribute first, fallback to bracketed tag in title
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
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActiveDigest();
  }, [token]);

  const handleGenerate = async () => {
    if (!token) return;
    setIsGenerating(true);
    try {
      await digestsApi.triggerEngine(token);
      message.success("Generating your news digest...");
      
      // Wait for the engine to finish generating, then reload
      setTimeout(() => {
        loadActiveDigest();
        setIsGenerating(false);
      }, 8000);
      
    } catch (err) {
      message.error("Failed to generate your digest. Please try again later.");
      setIsGenerating(false);
    }
  };

  const handleDeleteStory = async (storyLink: string, storyTitle: string) => {
    if (!latestDigest || !token) return;
    
    // Optimistic UI: remove card immediately, sync with server in background
    const previousStories = [...parsedStories];
    const updatedStories = parsedStories.filter(s => s.link !== storyLink);
    setParsedStories(updatedStories);
    
    try {
      const resData = await digestsApi.deleteStory(token, latestDigest.digest_id, storyLink, storyTitle);
      
      if (resData.success) {
        message.success("Story removed.");
      } else {
        throw new Error(resData.error);
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg = err.response?.data?.error || err.message || "Unknown error";
      message.error(`Failed to remove story: ${errorMsg}`);
      setParsedStories(previousStories);
    }
  };

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
        <Spin size="large" tip="Loading your digest..." />
      </div>
    );
  }

  if (!latestDigest || !digestHtml) {
    return (
      <div className="page-container" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty 
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div style={{ textAlign: 'center', maxWidth: '400px', margin: '0 auto' }}>
              <Title level={2} style={{ marginBottom: '8px' }}>No digest yet</Title>
              <Paragraph type="secondary" style={{ fontSize: '16px' }}>
                Your first digest will be generated automatically tomorrow at 8:00 AM. 
                Or generate one right now manually.
              </Paragraph>
            </div>
          }
        >
          <Space size="middle" style={{ marginTop: '20px' }}>
            <Button type="primary" size="large" onClick={handleGenerate} loading={isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate Now'}
            </Button>
            <Button size="large" href="/feeds">
              Configure Feeds
            </Button>
          </Space>
        </Empty>
      </div>
    );
  }

  return (
    <>
      <div className="print-container page-container" style={{ paddingBottom: '100px' }}>
        {/* Hero Section */}
        <div className="no-print" style={{ marginBottom: '64px', textAlign: 'center', marginTop: '40px' }}>
          <Text style={{ letterSpacing: '2px', fontSize: '14px', color: '#94a3b8', textTransform: 'uppercase' }}>
            {userName ? `${userName}'s ` : ''}Daily Digest
          </Text>
          <Title style={{ margin: '8px 0', fontSize: '56px', fontWeight: 800 }}>
            {getFormattedDate(latestDigest.created_at)}
          </Title>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
            <CheckCircleOutlined style={{ color: '#00d4aa', fontSize: '20px' }} />
            <Text style={{ fontSize: '20px', color: '#00d4aa' }}>Your personal digest is ready</Text>
          </div>
        </div>

        {/* Filters */}
        <div className="no-print">
          <Tabs 
            className="custom-briefr-tabs"
            activeKey={activeTab} 
            onChange={setActiveTab}
            items={['All', 'Tech', 'World', 'Science', 'Business', 'Sports', 'Entertainment', 'Others'].map(c => ({ key: c, label: c }))}
            tabBarStyle={{ marginBottom: '40px' }}
          />
        </div>

        {/* Story Grid */}
        <Row gutter={[24, 24]}>
          {parsedStories
            .filter(story => activeTab === 'All' || story.category.toLowerCase() === activeTab.toLowerCase())
            .map(story => (
              <Col xs={24} sm={12} lg={8} key={story.id} style={{ display: 'flex' }}>
                <div style={{ width: '100%' }}>
                  <StoryCard 
                    {...story} 
                    onDelete={() => handleDeleteStory(story.link, story.title)}
                  />
                </div>
              </Col>
            ))}
        </Row>
        
        {/* Hidden iframe for PDF printing */}
        <iframe 
           id="print-iframe"
           srcDoc={digestHtml || undefined} 
           style={{ width: '0', height: '0', border: 'none', position: 'absolute' }}
           title="Print Document"
        />
      </div>

      {/* Floating Action Bar */}
      <div className="floating-action-bar">
        <Button 
          type="primary" 
          icon={<DownloadOutlined />} 
          size="large"
          style={{ width: '200px', fontWeight: 500 }}
          onClick={handleDownloadPdf}
        >
          Download PDF
        </Button>
        <Button 
          icon={isGenerating ? <SyncOutlined spin /> : <ThunderboltOutlined />} 
          size="large"
          style={{ width: '200px', background: '#161625', color: '#fff', borderColor: '#2a2a4a' }}
          onClick={handleGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? 'Processing...' : 'Generate Now'}
        </Button>
      </div>
    </>
  );
}
