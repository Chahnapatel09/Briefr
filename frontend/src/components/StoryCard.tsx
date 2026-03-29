import { Card, Typography, Tooltip } from 'antd';
import { ExportOutlined, DeleteOutlined } from '@ant-design/icons';

const CATEGORY_COLORS: Record<string, string> = {
  'Tech': 'purple',
  'World': 'blue',
  'Science': 'cyan',
  'Business': 'gold',
  'Sports': 'green',
  'Entertainment': 'magenta',
  'Others': 'orange'
};

const { Title, Paragraph, Text } = Typography;

interface StoryCardProps {
  title: string;
  summary: string;
  source: string;
  category: string;
  link: string;
  onDelete?: () => void;
}

export default function StoryCard({ title, summary, source, category, link, onDelete }: StoryCardProps) {
  const categoryColor = CATEGORY_COLORS[category] || 'default';
  
  // Category-tinted background colors
  const bgTintMap: Record<string, string> = {
    Tech: 'rgba(114, 46, 209, 0.15)', // faint purple
    World: 'rgba(24, 144, 255, 0.15)',  // faint blue
    Science: 'rgba(0, 212, 170, 0.15)', // faint cyan/teal
    Business: 'rgba(250, 173, 20, 0.15)', // faint gold
    Sports: 'rgba(82, 196, 26, 0.15)', // faint green
    Entertainment: 'rgba(235, 47, 150, 0.15)', // faint magenta
    Others: 'rgba(250, 140, 22, 0.15)', // faint orange
  };
  const bgTint = bgTintMap[category] || 'rgba(255, 255, 255, 0.05)';

  const getTagColor = () => {
    switch (categoryColor) {
      case 'purple': return '#722ed1';
      case 'blue': return '#1890ff';
      case 'cyan': return '#00d4aa';
      case 'gold': return '#faad14';
      case 'green': return '#52c41a';
      case 'magenta': return '#eb2f96';
      case 'orange': return '#fa8c16';
      default: return '#94a3b8';
    }
  };

  return (
    <Card
      className="story-card-container"
      bordered={true}
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ padding: 0, display: 'flex', flexDirection: 'column', flex: 1 }}
    >
      {/* Category Header */}
      <div style={{ 
        background: bgTint, 
        padding: '8px 20px', 
        borderTopLeftRadius: '12px', 
        borderTopRightRadius: '12px',
        borderBottom: '1px solid #2a2a4a'
      }}>
        <Text style={{ color: getTagColor(), fontWeight: 600, fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {category}
        </Text>
      </div>
      
      {/* Content */}
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
        <Title level={4} style={{ marginTop: 0, marginBottom: '12px', lineHeight: 1.4, fontSize: '20px' }} ellipsis={{ rows: 2 }}>
          {title}
        </Title>
        
        <Paragraph type="secondary" style={{ flexGrow: 1, marginBottom: '24px', fontSize: '15px' }} ellipsis={{ rows: 2 }}>
          {summary}
        </Paragraph>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #2a2a4a', paddingTop: '16px' }}>
          <Text type="secondary" style={{ fontSize: '13px' }}>{source}</Text>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <Tooltip title="View Source">
              <a href={link} target="_blank" rel="noreferrer" style={{ color: '#00d4aa', fontSize: '16px' }}>
                <ExportOutlined />
              </a>
            </Tooltip>
            {onDelete && (
              <Tooltip title="Delete Story">
                <DeleteOutlined 
                  className="delete-icon-hover"
                  style={{ color: '#94a3b8', fontSize: '16px', cursor: 'pointer', transition: 'color 0.3s' }} 
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                />
              </Tooltip>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
