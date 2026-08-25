import React from 'react';
import {
  SimpleGrid,
  Card,
  Text,
  Group,
  Stack,
  Badge,
  Button,
  ThemeIcon,
  Paper,
  Table,
  Tooltip,
  Box,
} from '@mantine/core';
import {
  IconBox,
  IconAlertTriangle,
  IconCircleOff,
  IconTags,
  IconTruckLoading,
  IconArrowRight,
  IconShoppingCart,
  IconSparkles,
} from '@tabler/icons-react';

export function OverviewView({
  products = [],
  pricingSuggestions = [],
  reorderSuggestions = [],
  onNavigateToRecommendations,
  onNavigateToProducts,
  onSimulateSale,
}) {
  const totalProducts = products.length;
  const lowStockProducts = products.filter((p) => p.stockLevel > 0 && p.stockLevel < p.reorderThreshold);
  const outOfStockProducts = products.filter((p) => p.stockLevel === 0 || p.status === 'OUT_OF_STOCK');
  const pendingPricing = pricingSuggestions.filter((s) => s.status === 'PENDING');
  const pendingReorders = reorderSuggestions.filter((s) => s.status === 'PENDING');
  const totalPending = pendingPricing.length + pendingReorders.length;

  const healthyStockCount = totalProducts - lowStockProducts.length - outOfStockProducts.length;

  return (
    <Stack gap="lg">
      {/* Welcome & Live Summary Banner */}
      <Paper p="lg" radius="md" bg="#ffffff" withBorder style={{ borderColor: '#e2e8f0' }}>
        <Group justify="space-between" align="center">
          <div>
            <Group gap="xs" mb={4}>
              <Text size="xl" fw={700} style={{ fontFamily: 'Outfit, sans-serif', color: '#0f172a' }}>
                Merchandising Operations Hub
              </Text>
              {totalPending > 0 ? (
                <Badge color="yellow" variant="light" size="md" leftSection={<IconSparkles size={13} />}>
                  {totalPending} Decision(s) Requiring Attention
                </Badge>
              ) : (
                <Badge color="teal" variant="light" size="md">
                  All Systems Optimal
                </Badge>
              )}
            </Group>
            <Text size="sm" c="#64748b">
              Autonomous inventory signals and AI pricing advisors are continuously monitoring your catalog.
            </Text>
          </div>

          <Group gap="sm">
            <Button
              variant="default"
              color="gray"
              size="sm"
              leftSection={<IconBox size={15} />}
              onClick={onNavigateToProducts}
            >
              View Catalog
            </Button>
            {totalPending > 0 && (
              <Button
                variant="filled"
                color="teal"
                size="sm"
                rightSection={<IconArrowRight size={15} />}
                onClick={onNavigateToRecommendations}
              >
                Review Recommendations ({totalPending})
              </Button>
            )}
          </Group>
        </Group>
      </Paper>

      {/* Primary KPI Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, md: 5 }} spacing="md">
        {/* Total Products */}
        <Card p="md" radius="md" withBorder style={{ borderColor: '#e2e8f0' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="#64748b" fw={600} tt="uppercase">
              Total Catalog
            </Text>
            <ThemeIcon color="gray" variant="light" size="sm" radius="sm">
              <IconBox size={15} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap={6}>
            <Text size="1.75rem" fw={800} lh={1} c="#0f172a">
              {totalProducts}
            </Text>
            <Text size="xs" c="#64748b" pb={2}>
              SKUs
            </Text>
          </Group>
          <Text size="xs" c="#0d9488" fw={500} mt="xs">
            {healthyStockCount} Healthy Stock
          </Text>
        </Card>

        {/* Low Stock */}
        <Card p="md" radius="md" withBorder style={{ borderColor: '#e2e8f0' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="#64748b" fw={600} tt="uppercase">
              Low Stock
            </Text>
            <ThemeIcon color="orange" variant="light" size="sm" radius="sm">
              <IconAlertTriangle size={15} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap={6}>
            <Text size="1.75rem" fw={800} lh={1} c={lowStockProducts.length > 0 ? '#d97706' : '#64748b'}>
              {lowStockProducts.length}
            </Text>
            <Text size="xs" c="#64748b" pb={2}>
              items
            </Text>
          </Group>
          <Text size="xs" c="#64748b" mt="xs">
            Below Reorder Level
          </Text>
        </Card>

        {/* Out of Stock */}
        <Card p="md" radius="md" withBorder style={{ borderColor: '#e2e8f0' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="#64748b" fw={600} tt="uppercase">
              Out of Stock
            </Text>
            <ThemeIcon color="red" variant="light" size="sm" radius="sm">
              <IconCircleOff size={15} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap={6}>
            <Text size="1.75rem" fw={800} lh={1} c={outOfStockProducts.length > 0 ? '#dc2626' : '#64748b'}>
              {outOfStockProducts.length}
            </Text>
            <Text size="xs" c="#64748b" pb={2}>
              items
            </Text>
          </Group>
          <Text size="xs" c="#64748b" mt="xs">
            Zero On-Hand
          </Text>
        </Card>

        {/* Pending Pricing */}
        <Card p="md" radius="md" withBorder style={{ borderColor: '#e2e8f0' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="#64748b" fw={600} tt="uppercase">
              Pending Pricing
            </Text>
            <ThemeIcon color="yellow" variant="light" size="sm" radius="sm">
              <IconTags size={15} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap={6}>
            <Text size="1.75rem" fw={800} lh={1} c={pendingPricing.length > 0 ? '#ca8a04' : '#64748b'}>
              {pendingPricing.length}
            </Text>
            <Text size="xs" c="#64748b" pb={2}>
              proposals
            </Text>
          </Group>
          <Text size="xs" c="#64748b" mt="xs">
            Awaiting Approval
          </Text>
        </Card>

        {/* Pending Reorder */}
        <Card p="md" radius="md" withBorder style={{ borderColor: '#e2e8f0' }}>
          <Group justify="space-between" mb="xs">
            <Text size="xs" c="#64748b" fw={600} tt="uppercase">
              Pending Reorder
            </Text>
            <ThemeIcon color="teal" variant="light" size="sm" radius="sm">
              <IconTruckLoading size={15} />
            </ThemeIcon>
          </Group>
          <Group align="flex-end" gap={6}>
            <Text size="1.75rem" fw={800} lh={1} c={pendingReorders.length > 0 ? '#0f766e' : '#64748b'}>
              {pendingReorders.length}
            </Text>
            <Text size="xs" c="#64748b" pb={2}>
              orders
            </Text>
          </Group>
          <Text size="xs" c="#64748b" mt="xs">
            Replenishment
          </Text>
        </Card>
      </SimpleGrid>

      {/* Action-Required Products Table */}
      <Paper p="lg" radius="md" bg="#ffffff" withBorder style={{ borderColor: '#e2e8f0' }}>
        <Group justify="space-between" mb="md">
          <div>
            <Text fw={700} size="md" style={{ fontFamily: 'Outfit, sans-serif', color: '#0f172a' }}>
              Priority Inventory Watchlist
            </Text>
            <Text size="xs" c="#64748b">
              Products with active inventory alerts, review requirements, or sales velocity surges
            </Text>
          </div>
          <Button variant="subtle" size="compact-sm" color="teal" onClick={onNavigateToProducts}>
            View Full Catalog &rarr;
          </Button>
        </Group>

        <Table verticalSpacing="sm" highlightOnHover styles={{ tr: { borderBottom: '1px solid #f1f5f9' } }}>
          <Table.Thead>
            <Table.Tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: '13px' }}>Product</Table.Th>
              <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: '13px' }}>Category</Table.Th>
              <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: '13px' }}>Price</Table.Th>
              <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: '13px' }}>Stock vs Threshold</Table.Th>
              <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: '13px' }}>Velocity</Table.Th>
              <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: '13px' }}>Status</Table.Th>
              <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: '13px', textAlign: 'right' }}>Quick Action</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {products.slice(0, 5).map((product) => {
              const isLowStock = product.stockLevel < product.reorderThreshold && product.stockLevel > 0;
              const isOutOfStock = product.stockLevel === 0;

              return (
                <Table.Tr key={product._id || product.productId}>
                  <Table.Td>
                    <div>
                      <Text fw={600} size="sm" c="#0f172a">
                        {product.name}
                      </Text>
                      <Text size="xs" c="#64748b">
                        {product.sku} · {product.productId}
                      </Text>
                    </div>
                  </Table.Td>
                  <Table.Td>
                    <Badge variant="outline" color="gray" size="xs">
                      {product.category}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={600} size="sm" c="#0f172a">
                      ${Number(product.currentPrice).toFixed(2)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap={6}>
                      <Text
                        fw={700}
                        size="sm"
                        c={isOutOfStock ? '#dc2626' : isLowStock ? '#d97706' : '#059669'}
                      >
                        {product.stockLevel}
                      </Text>
                      <Text size="xs" c="#94a3b8">
                        / {product.reorderThreshold} target
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge color="blue" variant="subtle" size="sm">
                      {product.demandVelocity} orders/24h
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {product.status === 'ACTIVE' && (
                      <Badge color="green" variant="light" size="sm">
                        Active
                      </Badge>
                    )}
                    {product.status === 'PRICE_REVIEW_PENDING' && (
                      <Badge color="yellow" variant="light" size="sm">
                        Review Pending
                      </Badge>
                    )}
                    {product.status === 'OUT_OF_STOCK' && (
                      <Badge color="red" variant="light" size="sm">
                        Out of Stock
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td style={{ textAlign: 'right' }}>
                    <Tooltip label="Simulate 1 customer order (decrements stock & triggers agentic loop)">
                      <Button
                        size="compact-xs"
                        variant="light"
                        color="teal"
                        leftSection={<IconShoppingCart size={13} />}
                        disabled={product.stockLevel <= 0}
                        onClick={() => onSimulateSale(product.productId || product._id)}
                      >
                        Simulate Sale
                      </Button>
                    </Tooltip>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  );
}

export default OverviewView;
