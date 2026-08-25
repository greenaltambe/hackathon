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
      component="header"
      px="lg"
      py={8}
      style={{
        borderBottom: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Group justify="space-between" align="center" wrap="nowrap">
        {/* Left: Brand & Identity */}
        <Group
          gap="xs"
          style={{ cursor: 'pointer', userSelect: 'none' }}
          onClick={() => setActiveTab('overview')}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              setActiveTab('overview');
            }
          }}
          aria-label="StockPulse home"
        >
          <IconActivity size={24} color="#0d9488" stroke={2.5} aria-hidden="true" />
          <Text
            size="md"
            fw={800}
            style={{
              fontFamily: 'Outfit, sans-serif',
              letterSpacing: '-0.4px',
              color: '#0f172a',
              lineHeight: 1,
            }}
          >
            StockPulse
          </Text>
          <Badge variant="subtle" color="teal" size="xs" radius="sm">
            Console
          </Badge>
        </Group>

        {/* Center: Dominant Primary Navigation */}
        <Group gap={4} role="navigation" aria-label="Main Navigation">
          <Button
            variant={activeTab === 'overview' ? 'light' : 'subtle'}
            color="teal"
            size="sm"
            onClick={() => setActiveTab('overview')}
            aria-current={activeTab === 'overview' ? 'page' : undefined}
            styles={{
              root: {
                fontWeight: activeTab === 'overview' ? 700 : 500,
                color: activeTab === 'overview' ? '#0f766e' : '#475569',
                height: '34px',
                padding: '0 14px',
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
            aria-current={activeTab === 'products' ? 'page' : undefined}
            styles={{
              root: {
                fontWeight: activeTab === 'products' ? 700 : 500,
                color: activeTab === 'products' ? '#0f766e' : '#475569',
                height: '34px',
                padding: '0 14px',
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
            aria-current={activeTab === 'recommendations' ? 'page' : undefined}
            styles={{
              root: {
                fontWeight: activeTab === 'recommendations' ? 700 : 500,
                color: activeTab === 'recommendations' ? '#0f766e' : '#475569',
                height: '34px',
                padding: '0 14px',
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

        {/* Right: Quiet Controls & Server Status */}
        <Group gap="sm" wrap="nowrap">
          <Tooltip label="Auto-poll every 5 seconds for new agentic recommendations">
            <Switch
              size="xs"
              color="teal"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.currentTarget.checked)}
              label="Live Polling"
              aria-label="Toggle live polling every 5 seconds"
              styles={{
                label: { fontSize: '12px', color: '#64748b', fontWeight: 500, cursor: 'pointer' },
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
              aria-label="Refresh catalog and recommendations"
            >
              <IconRefresh size={16} color="#64748b" />
            </ActionIcon>
          </Tooltip>

          <Divider orientation="vertical" h={16} color="#e2e8f0" />

          {/* Backend Status indicator */}
          <Tooltip label={health?.status === 'ok' ? 'Connected to StockPulse REST API' : 'Backend connection unavailable'}>
            <Group gap={6} style={{ cursor: 'default' }}>
              <Box
                w={7}
                h={7}
                style={{
                  borderRadius: '50%',
                  backgroundColor: health?.status === 'ok' ? '#10b981' : '#ef4444',
                }}
                aria-hidden="true"
              />
              <Text size="xs" c="#64748b" fw={500}>
                {health?.status === 'ok' ? 'Connected' : 'Offline'}
              </Text>
            </Group>
          </Tooltip>
        </Group>
      </Group>
    </Box>
  );
}

export default Header;
