import React from 'react';
import {
  Group,
  Text,
  Badge,
  Button,
  ActionIcon,
  Switch,
  Tooltip,
  Box,
  Divider,
} from '@mantine/core';
import {
  IconRefresh,
  IconActivity,
  IconCheck,
  IconAlertTriangle,
} from '@tabler/icons-react';

export function Header({
  health,
  autoRefresh,
  setAutoRefresh,
  onRefresh,
  loading,
  activeTab,
  setActiveTab,
  pendingCount,
}) {
  return (
    <Box
      px="lg"
      py="xs"
      style={{
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
      }}
    >
      <Group justify="space-between" align="center">
        {/* Left: Brand & Identity */}
        <Group gap="xs" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('overview')}>
          <IconActivity size={26} color="#0d9488" stroke={2.5} />
          <Text
            size="lg"
            fw={800}
            style={{
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.5px',
              color: '#0f172a',
            }}
          >
            StockPulse
          </Text>
          <Badge variant="subtle" color="teal" size="xs" radius="sm">
            Console
          </Badge>
        </Group>

        {/* Center: Dominant Primary Navigation */}
        <Group gap={6}>
          <Button
            variant={activeTab === 'overview' ? 'light' : 'subtle'}
            color="teal"
            size="sm"
            onClick={() => setActiveTab('overview')}
            styles={{
              root: {
                fontWeight: activeTab === 'overview' ? 700 : 500,
                color: activeTab === 'overview' ? '#0f766e' : '#475569',
              },
            }}
          >
            Overview
          </Button>

          <Button
            variant={activeTab === 'products' ? 'light' : 'subtle'}
            color="teal"
            size="sm"
            onClick={() => setActiveTab('products')}
            styles={{
              root: {
                fontWeight: activeTab === 'products' ? 700 : 500,
                color: activeTab === 'products' ? '#0f766e' : '#475569',
              },
            }}
          >
            Products Catalog
          </Button>

          <Button
            variant={activeTab === 'recommendations' ? 'light' : 'subtle'}
            color="teal"
            size="sm"
            onClick={() => setActiveTab('recommendations')}
            styles={{
              root: {
                fontWeight: activeTab === 'recommendations' ? 700 : 500,
                color: activeTab === 'recommendations' ? '#0f766e' : '#475569',
              },
            }}
            rightSection={
              pendingCount > 0 ? (
                <Badge size="xs" color="yellow" variant="filled" circle>
                  {pendingCount}
                </Badge>
              ) : null
            }
          >
            Recommendations
          </Button>
        </Group>

        {/* Right: Clean, Quiet Controls & Server Status */}
        <Group gap="sm">
          <Tooltip label="Auto-poll every 5 seconds for new agentic recommendations">
            <Switch
              size="xs"
              color="teal"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
              label="Live Polling"
              styles={{
                label: { fontSize: '12px', color: '#64748b', fontWeight: 500 },
              }}
            />
          </Tooltip>

          <Tooltip label="Refresh catalog and recommendations">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="md"
              onClick={onRefresh}
              loading={loading}
            >
              <IconRefresh size={16} color="#64748b" />
            </ActionIcon>
          </Tooltip>

          <Divider orientation="vertical" h={18} />

          {/* Backend Status indicator */}
          <Group gap={6}>
            <Box
              w={7}
              h={7}
              style={{
                borderRadius: '50%',
                backgroundColor: health?.status === 'ok' ? '#10b981' : '#ef4444',
              }}
            />
            <Text size="xs" c="#64748b" fw={500}>
              {health?.status === 'ok' ? 'Connected' : 'Offline'}
            </Text>
          </Group>
        </Group>
      </Group>
    </Box>
  );
}

export default Header;
