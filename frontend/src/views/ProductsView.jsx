import React, { useState } from 'react';
import {
  Paper,
  Table,
  Group,
  TextInput,
  Select,
  Text,
  Badge,
  Button,
  ActionIcon,
  Modal,
  NumberInput,
  Drawer,
  Stack,
  Progress,
  Divider,
  Menu,
  Tooltip,
  Alert,
} from '@mantine/core';
import {
  IconSearch,
  IconFilter,
  IconShoppingCart,
  IconEdit,
  IconSparkles,
  IconTrendingUp,
  IconTags,
  IconTruckLoading,
} from '@tabler/icons-react';

export function ProductsView({
  products = [],
  pricingSuggestions = [],
  reorderSuggestions = [],
  onSimulateSale,
  onUpdateStock,
  onRequestPricingSuggestion,
  onRequestReorderSuggestion,
  loading,
}) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Stock edit modal state
  const [stockModalProduct, setStockModalProduct] = useState(null);
  const [newStockValue, setNewStockValue] = useState(0);

  // Detail drawer state
  const [detailProduct, setDetailProduct] = useState(null);

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      search === '' ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.productId && p.productId.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleOpenStockModal = (product) => {
    setStockModalProduct(product);
    setNewStockValue(product.stockLevel);
  };

  const handleSaveStock = async () => {
    if (stockModalProduct) {
      await onUpdateStock(stockModalProduct.productId || stockModalProduct._id, newStockValue);
      setStockModalProduct(null);
    }
  };

  return (
    <Stack gap="md">
      {/* Search & Filter Toolbar */}
      <Paper p="md" radius="md" bg="#ffffff" withBorder style={{ borderColor: '#e2e8f0' }}>
        <Group justify="space-between" wrap="wrap" gap="md">
          <TextInput
            placeholder="Search catalog by SKU, Product Name..."
            leftSection={<IconSearch size={16} color="#94a3b8" />}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1, minWidth: '260px' }}
            size="sm"
          />

          <Group gap="sm">
            <Select
              leftSection={<IconFilter size={15} color="#94a3b8" />}
              data={[
                { value: 'ALL', label: 'All Categories' },
                { value: 'ELECTRONICS', label: 'Electronics' },
                { value: 'APPAREL', label: 'Apparel' },
                { value: 'HOME', label: 'Home' },
                { value: 'OUTDOORS', label: 'Outdoors' },
              ]}
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val || 'ALL')}
              size="sm"
              w={160}
            />

            <Select
              data={[
                { value: 'ALL', label: 'All Statuses' },
                { value: 'ACTIVE', label: 'Active' },
                { value: 'PRICE_REVIEW_PENDING', label: 'Review Pending' },
                { value: 'OUT_OF_STOCK', label: 'Out of Stock' },
              ]}
              value={statusFilter}
              onChange={(val) => setStatusFilter(val || 'ALL')}
              size="sm"
              w={160}
            />
          </Group>
        </Group>
      </Paper>

      {/* Catalog Table */}
      <Paper p="lg" radius="md" bg="#ffffff" withBorder style={{ borderColor: '#e2e8f0' }}>
        <Group justify="space-between" mb="sm">
          <Text fw={700} size="md" style={{ fontFamily: 'Outfit, sans-serif', color: '#0f172a' }}>
            Products Catalog ({filteredProducts.length} items)
          </Text>
          <Text size="xs" c="#64748b">
            Simulate customer sales or edit inventory to test real-time agentic recommendations.
          </Text>
        </Group>

        <Table verticalSpacing="sm" highlightOnHover styles={{ tr: { borderBottom: '1px solid #f1f5f9' } }}>
          <Table.Thead>
            <Table.Tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: '13px' }}>Product & SKU</Table.Th>
              <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: '13px' }}>Category</Table.Th>
              <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: '13px' }}>Selling Price</Table.Th>
              <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: '13px', width: '220px' }}>Inventory Health</Table.Th>
              <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: '13px' }}>Velocity</Table.Th>
              <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: '13px' }}>Status</Table.Th>
              <Table.Th style={{ color: '#475569', fontWeight: 600, fontSize: '13px', textAlign: 'right' }}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {filteredProducts.length === 0 ? (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text ta="center" c="#64748b" py="xl">
                    No products match the selected filters.
                  </Text>
                </Table.Td>
              </Table.Tr>
            ) : (
              filteredProducts.map((product) => {
                const isOutOfStock = product.stockLevel === 0 || product.status === 'OUT_OF_STOCK';
                const isLowStock = product.stockLevel < product.reorderThreshold && product.stockLevel > 0;
                const stockRatio = Math.min(100, Math.round((product.stockLevel / (product.reorderThreshold * 2)) * 100));

                return (
                  <Table.Tr key={product._id || product.productId}>
                    <Table.Td>
                      <div>
                        <Text
                          fw={600}
                          size="sm"
                          c="#0f172a"
                          style={{ cursor: 'pointer' }}
                          onClick={() => setDetailProduct(product)}
                        >
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
                      <Text fw={700} size="sm" c="#0f172a">
                        ${Number(product.currentPrice).toFixed(2)}
                      </Text>
                    </Table.Td>

                    <Table.Td>
                      <Stack gap={3}>
                        <Group justify="space-between">
                          <Text
                            size="xs"
                            fw={700}
                            c={isOutOfStock ? '#dc2626' : isLowStock ? '#d97706' : '#059669'}
                          >
                            {product.stockLevel} units on-hand
                          </Text>
                          <Text size="xs" c="#94a3b8">
                            Threshold: {product.reorderThreshold}
                          </Text>
                        </Group>
                        <Progress
                          value={stockRatio}
                          color={isOutOfStock ? 'red' : isLowStock ? 'orange' : 'teal'}
                          size="xs"
                          radius="xl"
                        />
                      </Stack>
                    </Table.Td>

                    <Table.Td>
                      <Badge color="blue" variant="subtle" size="sm" leftSection={<IconTrendingUp size={12} />}>
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
                      <Group gap={6} justify="flex-end">
                        <Tooltip label="Simulate 1 purchase order (decrements stock & triggers agentic loop)">
                          <ActionIcon
                            variant="light"
                            color="teal"
                            size="sm"
                            disabled={isOutOfStock}
                            onClick={() => onSimulateSale(product.productId || product._id)}
                          >
                            <IconShoppingCart size={15} />
                          </ActionIcon>
                        </Tooltip>

                        <Tooltip label="Directly update stock level">
                          <ActionIcon
                            variant="light"
                            color="gray"
                            size="sm"
                            onClick={() => handleOpenStockModal(product)}
                          >
                            <IconEdit size={15} />
                          </ActionIcon>
                        </Tooltip>

                        <Menu position="bottom-end" shadow="md">
                          <Menu.Target>
                            <Tooltip label="Run on-demand AI / Rule strategies">
                              <ActionIcon variant="subtle" color="blue" size="sm">
                                <IconSparkles size={15} />
                              </ActionIcon>
                            </Tooltip>
                          </Menu.Target>
                          <Menu.Dropdown>
                            <Menu.Label>On-Demand Advisors</Menu.Label>
                            <Menu.Item
                              leftSection={<IconTags size={14} />}
                              onClick={() => onRequestPricingSuggestion(product.productId || product._id)}
                            >
                              Request Pricing Suggestion
                            </Menu.Item>
                            <Menu.Item
                              leftSection={<IconTruckLoading size={14} />}
                              onClick={() => onRequestReorderSuggestion(product.productId || product._id)}
                            >
                              Request Reorder Suggestion
                            </Menu.Item>
                          </Menu.Dropdown>
                        </Menu>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                );
              })
            )}
          </Table.Tbody>
        </Table>
      </Paper>

      {/* Stock Edit Modal */}
      <Modal
        opened={!!stockModalProduct}
        onClose={() => setStockModalProduct(null)}
        title={<Text fw={700} c="#0f172a">Update Inventory Stock Level</Text>}
        centered
      >
        {stockModalProduct && (
          <Stack gap="md">
            <Text size="sm" c="#334155">
              Set on-hand stock for <strong>{stockModalProduct.name}</strong> ({stockModalProduct.sku}):
            </Text>
            <NumberInput
              label="New Stock Level"
              description={`Reorder threshold is ${stockModalProduct.reorderThreshold} units.`}
              min={0}
              value={newStockValue}
              onChange={(val) => setNewStockValue(val)}
            />
            {newStockValue < stockModalProduct.reorderThreshold && (
              <Alert color="orange" title="Agentic Signal Alert">
                Setting stock below threshold ({stockModalProduct.reorderThreshold}) will trigger an autonomous INVENTORY_LOW recommendation loop.
              </Alert>
            )}
            <Group justify="flex-end" mt="sm">
              <Button variant="default" onClick={() => setStockModalProduct(null)}>
                Cancel
              </Button>
              <Button color="teal" onClick={handleSaveStock}>
                Update Stock
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>

      {/* Product Detail Drawer */}
      <Drawer
        opened={!!detailProduct}
        onClose={() => setDetailProduct(null)}
        position="right"
        size="md"
        title={<Text fw={700} size="lg" c="#0f172a">Product Details</Text>}
      >
        {detailProduct && (
          <Stack gap="md">
            <Paper p="md" withBorder radius="md" bg="#f8fafc" style={{ borderColor: '#e2e8f0' }}>
              <Text size="xs" c="#64748b" tt="uppercase" fw={700}>
                Product Summary
              </Text>
              <Text fw={700} size="xl" mt={4} c="#0f172a">
                {detailProduct.name}
              </Text>
              <Group gap="xs" mt="xs">
                <Badge color="gray" variant="outline">{detailProduct.sku}</Badge>
                <Badge color="blue" variant="light">{detailProduct.category}</Badge>
                <Badge color={detailProduct.status === 'ACTIVE' ? 'green' : 'orange'} variant="light">
                  {detailProduct.status}
                </Badge>
              </Group>
            </Paper>

            <Paper p="md" withBorder radius="md" style={{ borderColor: '#e2e8f0' }}>
              <Text size="xs" c="#64748b" tt="uppercase" fw={700} mb="xs">
                Key Performance Metrics
              </Text>
              <Group justify="space-between" py={4}>
                <Text size="sm" c="#64748b">Selling Price:</Text>
                <Text size="sm" fw={700} c="#0f172a">${Number(detailProduct.currentPrice).toFixed(2)}</Text>
              </Group>
              <Divider my={4} color="#f1f5f9" />
              <Group justify="space-between" py={4}>
                <Text size="sm" c="#64748b">On-Hand Stock:</Text>
                <Text size="sm" fw={700} c="#0f172a">{detailProduct.stockLevel} units</Text>
              </Group>
              <Divider my={4} color="#f1f5f9" />
              <Group justify="space-between" py={4}>
                <Text size="sm" c="#64748b">Reorder Threshold:</Text>
                <Text size="sm" fw={700} c="#0f172a">{detailProduct.reorderThreshold} units</Text>
              </Group>
              <Divider my={4} color="#f1f5f9" />
              <Group justify="space-between" py={4}>
                <Text size="sm" c="#64748b">Demand Velocity (24h):</Text>
                <Text size="sm" fw={700} c="#0f172a">{detailProduct.demandVelocity} orders</Text>
              </Group>
            </Paper>

            <Button
              color="teal"
              leftSection={<IconShoppingCart size={16} />}
              onClick={() => onSimulateSale(detailProduct.productId || detailProduct._id)}
            >
              Simulate Customer Order
            </Button>
          </Stack>
        )}
      </Drawer>
    </Stack>
  );
}

export default ProductsView;
