import React, { useState } from 'react';
import {
  Tabs,
  Paper,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  Select,
  SimpleGrid,
  Card,
  Progress,
  Divider,
  Modal,
  ThemeIcon,
  Alert,
} from '@mantine/core';
import {
  IconTags,
  IconTruckLoading,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconSparkles,
  IconArrowRight,
  IconClock,
} from '@tabler/icons-react';

export function RecommendationsView({
  pricingSuggestions = [],
  reorderSuggestions = [],
  onAcceptPricing,
  onRejectPricing,
  onAcceptReorder,
  onRejectReorder,
}) {
  const [activeTab, setActiveTab] = useState('pricing');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [triggerFilter, setTriggerFilter] = useState('ALL');
  const [actionLoading, setActionLoading] = useState(false);

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState(null); // { type: 'PRICING' | 'REORDER', action: 'ACCEPT' | 'REJECT', suggestion: Object }

  // Filter helper
  const filterList = (list) => {
    return list.filter((item) => {
      const matchStatus = statusFilter === 'ALL' || item.status === statusFilter;
      const matchTrigger = triggerFilter === 'ALL' || item.triggerReason === triggerFilter;
      return matchStatus && matchTrigger;
    });
  };

  const filteredPricing = filterList(pricingSuggestions);
  const filteredReorder = filterList(reorderSuggestions);

  const formatTriggerLabel = (trigger) => {
    switch (trigger) {
      case 'INVENTORY_LOW':
        return 'Inventory Low';
      case 'DEMAND_SPIKE':
        return 'Demand Spike';
      case 'MANUAL':
        return 'Manual Request';
      default:
        return trigger;
    }
  };

  const getTriggerColor = (trigger) => {
    switch (trigger) {
      case 'INVENTORY_LOW':
        return 'orange';
      case 'DEMAND_SPIKE':
        return 'blue';
      case 'MANUAL':
        return 'gray';
      default:
        return 'teal';
    }
  };

  const handleConfirmAction = async () => {
    if (!confirmModal) return;

    setActionLoading(true);
    try {
      const { type, action, suggestion } = confirmModal;
      if (type === 'PRICING') {
        if (action === 'ACCEPT') {
          await onAcceptPricing(suggestion._id);
        } else {
          await onRejectPricing(suggestion._id);
        }
      } else if (type === 'REORDER') {
        if (action === 'ACCEPT') {
          await onAcceptReorder(suggestion._id);
        } else {
          await onRejectReorder(suggestion._id);
        }
      }
      setConfirmModal(null);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Stack gap="lg">
      {/* Control & Filter Header */}
      <Paper p="md" radius="md" bg="#ffffff" withBorder style={{ borderColor: '#e2e8f0' }}>
        <Group justify="space-between" wrap="wrap" gap="md">
          <div>
            <Text fw={700} size="md" style={{ fontFamily: 'Outfit, sans-serif', color: '#0f172a' }}>
              Recommendations & Human Review Console
            </Text>
            <Text size="xs" c="#64748b">
              Review AI-generated dynamic pricing recommendations and replenishment proposals before publishing.
            </Text>
          </div>

          <Group gap="sm">
            <Select
              label="Status"
              data={[
                { value: 'PENDING', label: 'Pending Review' },
                { value: 'ACCEPTED', label: 'Accepted' },
                { value: 'REJECTED', label: 'Rejected' },
                { value: 'ALL', label: 'All Statuses' },
              ]}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val || 'PENDING')}
              size="xs"
              w={150}
              aria-label="Filter recommendations by status"
            />

            <Select
              label="Trigger Reason"
              data={[
                { value: 'ALL', label: 'All Triggers' },
                { value: 'INVENTORY_LOW', label: 'Inventory Low' },
                { value: 'DEMAND_SPIKE', label: 'Demand Spike' },
                { value: 'MANUAL', label: 'Manual Request' },
              ]}
              value={triggerFilter}
              onChange={(val) => setTriggerFilter(val || 'ALL')}
              size="xs"
              w={160}
              aria-label="Filter recommendations by trigger reason"
            />
          </Group>
        </Group>
      </Paper>

      {/* Tabs Container */}
      <Tabs value={activeTab} onChange={setActiveTab} variant="outline" color="teal">
        <Tabs.List mb="md" style={{ borderBottom: '1px solid #e2e8f0' }}>
          <Tabs.Tab
            value="pricing"
            leftSection={<IconTags size={15} aria-hidden="true" />}
            rightSection={
              filteredPricing.filter((s) => s.status === 'PENDING').length > 0 ? (
                <Badge size="xs" color="yellow" variant="filled" circle>
                  {filteredPricing.filter((s) => s.status === 'PENDING').length}
                </Badge>
              ) : null
            }
            style={{ fontWeight: 600 }}
            aria-label={`Dynamic Pricing Proposals (${filteredPricing.length})`}
          >
            Dynamic Pricing Proposals ({filteredPricing.length})
          </Tabs.Tab>

          <Tabs.Tab
            value="reorder"
            leftSection={<IconTruckLoading size={15} aria-hidden="true" />}
            rightSection={
              filteredReorder.filter((s) => s.status === 'PENDING').length > 0 ? (
                <Badge size="xs" color="teal" variant="filled" circle>
                  {filteredReorder.filter((s) => s.status === 'PENDING').length}
                </Badge>
              ) : null
            }
            style={{ fontWeight: 600 }}
            aria-label={`Inventory Replenishment Orders (${filteredReorder.length})`}
          >
            Inventory Replenishment Orders ({filteredReorder.length})
          </Tabs.Tab>
        </Tabs.List>

        {/* PRICING TAB CONTENT */}
        <Tabs.Panel value="pricing">
          {filteredPricing.length === 0 ? (
            <Paper p="xl" radius="md" bg="#ffffff" withBorder style={{ borderColor: '#e2e8f0' }} ta="center">
              <ThemeIcon color="gray" size="xl" radius="xl" variant="light" mx="auto" mb="sm">
                <IconTags size={24} />
              </ThemeIcon>
              <Text fw={700} size="md" c="#0f172a">
                No Pricing Proposals Found
              </Text>
              <Text size="xs" c="#64748b" mt={4}>
                {statusFilter === 'PENDING'
                  ? 'All pricing proposals have been reviewed and resolved.'
                  : 'No suggestions match the chosen filter criteria.'}
              </Text>
            </Paper>
          ) : (
            <SimpleGrid cols={{ base: 1, md: filteredPricing.length === 1 ? 1 : 2 }} spacing="md">
              {filteredPricing.map((item) => {
                const product = item.product || {};
                const currentPrice = Number(item.currentPrice);
                const recPrice = Number(item.recommendedPrice);
                const percentChange =
                  currentPrice > 0 ? (((recPrice - currentPrice) / currentPrice) * 100).toFixed(1) : '0';
                const confidencePct = Math.round(Number(item.confidence || 0) * 100);

                return (
                  <Card key={item._id} p="lg" radius="md" bg="#ffffff" withBorder style={{ borderColor: '#e2e8f0' }}>
                    <Stack justify="space-between" style={{ height: '100%' }} gap="md">
                      <div>
                        {/* 1. Header: Product Identity & Badges */}
                        <Group justify="space-between" align="flex-start" mb="xs">
                          <div>
                            <Text fw={700} size="md" c="#0f172a">
                              {product.name || 'Product'}
                            </Text>
                            <Text size="xs" c="#64748b">
                              {product.sku || 'N/A'} · {product.category || 'N/A'}
                            </Text>
                          </div>

                          <Group gap="xs">
                            <Badge color={getTriggerColor(item.triggerReason)} variant="light" size="xs">
                              {formatTriggerLabel(item.triggerReason)}
                            </Badge>
                            {item.status === 'PENDING' && (
                              <Badge color="yellow" variant="light" size="xs">
                                Pending Review
                              </Badge>
                            )}
                            {item.status === 'ACCEPTED' && (
                              <Badge color="green" variant="light" size="xs">
                                Accepted
                              </Badge>
                            )}
                            {item.status === 'REJECTED' && (
                              <Badge color="red" variant="light" size="xs">
                                Rejected
                              </Badge>
                            )}
                          </Group>
                        </Group>

                        {/* 2. Proposed Price Delta Box */}
                        <Paper p="md" radius="md" bg="#f8fafc" withBorder style={{ borderColor: '#e2e8f0' }} mb="sm">
                          <Group justify="space-between" align="center">
                            <div>
                              <Text size="xs" c="#64748b" fw={500}>
                                Current Selling Price
                              </Text>
                              <Text size="md" fw={600} td="line-through" c="#94a3b8">
                                ${currentPrice.toFixed(2)}
                              </Text>
                            </div>

                            <IconArrowRight size={18} color="#0d9488" aria-hidden="true" />

                            <div>
                              <Text size="xs" c="#64748b" fw={500}>
                                Proposed New Price
                              </Text>
                              <Text size="1.35rem" fw={800} c="#0f766e">
                                ${recPrice.toFixed(2)}
                              </Text>
                            </div>

                            <Badge
                              color={Number(percentChange) >= 0 ? 'teal' : 'orange'}
                              variant="filled"
                              size="md"
                            >
                              {Number(percentChange) >= 0 ? `+${percentChange}%` : `${percentChange}%`}
                            </Badge>
                          </Group>
                        </Paper>

                        {/* 3. Confidence Indicator */}
                        <Group justify="space-between" mb={4}>
                          <Text size="xs" c="#64748b">
                            Advisor Confidence
                          </Text>
                          <Text size="xs" fw={700} c="#0f766e">
                            {confidencePct}%
                          </Text>
                        </Group>
                        <Progress
                          value={confidencePct}
                          color="teal"
                          size="xs"
                          radius="xl"
                          mb="sm"
                          aria-label={`Advisor confidence: ${confidencePct}%`}
                        />

                        {/* 4. AI / Strategy Rationale */}
                        <Paper p="sm" radius="md" bg="#f8fafc" withBorder style={{ borderColor: '#e2e8f0' }}>
                          <Group gap={6} align="flex-start">
                            <IconSparkles size={15} color="#ca8a04" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                            <div>
                              <Text size="xs" fw={700} c="#0f172a" mb={2}>
                                Why StockPulse recommends this:
                              </Text>
                              <Text size="xs" c="#334155" style={{ lineHeight: 1.45 }}>
                                {item.reasoning}
                              </Text>
                            </div>
                          </Group>
                        </Paper>
                      </div>

                      {/* 5. Review Action Buttons */}
                      {item.status === 'PENDING' ? (
                        <Group justify="flex-end" gap="sm" pt="xs" style={{ borderTop: '1px solid #f1f5f9' }}>
                          <Button
                            variant="subtle"
                            color="gray"
                            size="sm"
                            leftSection={<IconX size={14} />}
                            onClick={() => setConfirmModal({ type: 'PRICING', action: 'REJECT', suggestion: item })}
                            aria-label={`Reject pricing recommendation for ${product.name}`}
                          >
                            Reject
                          </Button>
                          <Button
                            variant="filled"
                            color="teal"
                            size="sm"
                            leftSection={<IconCheck size={14} />}
                            onClick={() => setConfirmModal({ type: 'PRICING', action: 'ACCEPT', suggestion: item })}
                            aria-label={`Accept price update to $${recPrice.toFixed(2)} for ${product.name}`}
                          >
                            Accept Price Update
                          </Button>
                        </Group>
                      ) : (
                        <Text size="xs" c="#94a3b8" ta="right" pt="xs" style={{ borderTop: '1px solid #f1f5f9' }}>
                          Decision recorded: <strong>{item.status}</strong>
                        </Text>
                      )}
                    </Stack>
                  </Card>
                );
              })}
            </SimpleGrid>
          )}
        </Tabs.Panel>

        {/* REORDER TAB CONTENT */}
        <Tabs.Panel value="reorder">
          {filteredReorder.length === 0 ? (
            <Paper p="xl" radius="md" bg="#ffffff" withBorder style={{ borderColor: '#e2e8f0' }} ta="center">
              <ThemeIcon color="gray" size="xl" radius="xl" variant="light" mx="auto" mb="sm">
                <IconTruckLoading size={24} />
              </ThemeIcon>
              <Text fw={700} size="md" c="#0f172a">
                No Replenishment Orders Found
              </Text>
              <Text size="xs" c="#64748b" mt={4}>
                {statusFilter === 'PENDING'
                  ? 'All replenishment proposals have been reviewed.'
                  : 'No suggestions match the chosen filter criteria.'}
              </Text>
            </Paper>
          ) : (
            <SimpleGrid cols={{ base: 1, md: filteredReorder.length === 1 ? 1 : 2 }} spacing="md">
              {filteredReorder.map((item) => {
                const product = item.product || {};
                const currentStock = Number(item.currentStock || 0);
                const recQty = Number(item.recommendedQuantity || 0);
                const leadTime = Number(item.suggestedLeadTimeDays || 7);
                const confidencePct = Math.round(Number(item.confidence || 0) * 100);

                return (
                  <Card key={item._id} p="lg" radius="md" bg="#ffffff" withBorder style={{ borderColor: '#e2e8f0' }}>
                    <Stack justify="space-between" style={{ height: '100%' }} gap="md">
                      <div>
                        {/* Header: Product & Badges */}
                        <Group justify="space-between" align="flex-start" mb="xs">
                          <div>
                            <Text fw={700} size="md" c="#0f172a">
                              {product.name || 'Product'}
                            </Text>
                            <Text size="xs" c="#64748b">
                              {product.sku || 'N/A'} · {product.category || 'N/A'}
                            </Text>
                          </div>

                          <Group gap="xs">
                            <Badge color={getTriggerColor(item.triggerReason)} variant="light" size="xs">
                              {formatTriggerLabel(item.triggerReason)}
                            </Badge>
                            {item.status === 'PENDING' && (
                              <Badge color="yellow" variant="light" size="xs">
                                Pending PO
                              </Badge>
                            )}
                            {item.status === 'ACCEPTED' && (
                              <Badge color="green" variant="light" size="xs">
                                Replenished
                              </Badge>
                            )}
                            {item.status === 'REJECTED' && (
                              <Badge color="red" variant="light" size="xs">
                                Rejected
                              </Badge>
                            )}
                          </Group>
                        </Group>

                        {/* Replenishment Metrics Box */}
                        <Paper p="md" radius="md" bg="#f8fafc" withBorder style={{ borderColor: '#e2e8f0' }} mb="sm">
                          <Group justify="space-between" align="center">
                            <div>
                              <Text size="xs" c="#64748b" fw={500}>
                                On-Hand Inventory
                              </Text>
                              <Text size="md" fw={700} c={currentStock === 0 ? '#dc2626' : '#d97706'}>
                                {currentStock} units
                              </Text>
                            </div>

                            <div>
                              <Text size="xs" c="#64748b" fw={500}>
                                Recommended Order
                              </Text>
                              <Text size="1.35rem" fw={800} c="#0f766e">
                                +{recQty} units
                              </Text>
                            </div>

                            <div>
                              <Text size="xs" c="#64748b" fw={500}>
                                Est. Lead Time
                              </Text>
                              <Badge color="teal" variant="light" size="md" leftSection={<IconClock size={12} />}>
                                {leadTime} Days
                              </Badge>
                            </div>
                          </Group>
                        </Paper>

                        {/* Confidence Indicator */}
                        <Group justify="space-between" mb={4}>
                          <Text size="xs" c="#64748b">
                            Advisor Confidence
                          </Text>
                          <Text size="xs" fw={700} c="#0f766e">
                            {confidencePct}%
                          </Text>
                        </Group>
                        <Progress
                          value={confidencePct}
                          color="teal"
                          size="xs"
                          radius="xl"
                          mb="sm"
                          aria-label={`Advisor confidence: ${confidencePct}%`}
                        />

                        {/* Rationale Callout */}
                        <Paper p="sm" radius="md" bg="#f8fafc" withBorder style={{ borderColor: '#e2e8f0' }}>
                          <Group gap={6} align="flex-start">
                            <IconSparkles size={15} color="#0d9488" style={{ flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
                            <div>
                              <Text size="xs" fw={700} c="#0f172a" mb={2}>
                                Why StockPulse recommends this:
                              </Text>
                              <Text size="xs" c="#334155" style={{ lineHeight: 1.45 }}>
                                {item.reasoning}
                              </Text>
                            </div>
                          </Group>
                        </Paper>
                      </div>

                      {/* Review Actions */}
                      {item.status === 'PENDING' ? (
                        <Group justify="flex-end" gap="sm" pt="xs" style={{ borderTop: '1px solid #f1f5f9' }}>
                          <Button
                            variant="subtle"
                            color="gray"
                            size="sm"
                            leftSection={<IconX size={14} />}
                            onClick={() => setConfirmModal({ type: 'REORDER', action: 'REJECT', suggestion: item })}
                            aria-label={`Reject replenishment purchase order for ${product.name}`}
                          >
                            Reject PO
                          </Button>
                          <Button
                            variant="filled"
                            color="teal"
                            size="sm"
                            leftSection={<IconCheck size={14} />}
                            onClick={() => setConfirmModal({ type: 'REORDER', action: 'ACCEPT', suggestion: item })}
                            aria-label={`Accept replenishment of ${recQty} units for ${product.name}`}
                          >
                            Accept & Replenish Stock
                          </Button>
                        </Group>
                      ) : (
                        <Text size="xs" c="#94a3b8" ta="right" pt="xs" style={{ borderTop: '1px solid #f1f5f9' }}>
                          Decision recorded: <strong>{item.status}</strong>
                        </Text>
                      )}
                    </Stack>
                  </Card>
                );
              })}
            </SimpleGrid>
          )}
        </Tabs.Panel>
      </Tabs>

      {/* Human Review Confirmation Modal */}
      <Modal
        opened={!!confirmModal}
        onClose={() => setConfirmModal(null)}
        title={
          <Group gap="xs">
            <IconAlertTriangle color={confirmModal?.action === 'ACCEPT' ? '#0d9488' : '#dc2626'} size={20} aria-hidden="true" />
            <Text fw={700} c="#0f172a">
              Confirm {confirmModal?.action === 'ACCEPT' ? 'Approval' : 'Rejection'}
            </Text>
          </Group>
        }
        centered
      >
        {confirmModal && (
          <Stack gap="md">
            <Text size="sm" c="#334155">
              Are you sure you want to <strong>{confirmModal.action.toLowerCase()}</strong> this{' '}
              {confirmModal.type === 'PRICING' ? 'pricing update' : 'replenishment purchase order'} for{' '}
              <strong>{confirmModal.suggestion.product?.name || 'this product'}</strong>?
            </Text>

            {confirmModal.type === 'PRICING' && confirmModal.action === 'ACCEPT' && (
              <Alert color="teal" title="Live Pricing Update">
                This will update the live catalog selling price from{' '}
                <strong>${Number(confirmModal.suggestion.currentPrice).toFixed(2)}</strong> to{' '}
                <strong>${Number(confirmModal.suggestion.recommendedPrice).toFixed(2)}</strong>.
              </Alert>
            )}

            {confirmModal.type === 'REORDER' && confirmModal.action === 'ACCEPT' && (
              <Alert color="teal" title="Inbound Stock Replenishment">
                This will simulate inbound delivery and increment on-hand inventory by{' '}
                <strong>+{confirmModal.suggestion.recommendedQuantity} units</strong>.
              </Alert>
            )}

            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setConfirmModal(null)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                color={confirmModal.action === 'ACCEPT' ? 'teal' : 'red'}
                onClick={handleConfirmAction}
                loading={actionLoading}
              >
                Confirm {confirmModal.action}
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Stack>
  );
}

export default RecommendationsView;
