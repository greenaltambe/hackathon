import React, { useState, useEffect, useCallback } from 'react';
import {
  AppShell,
  Container,
  LoadingOverlay,
  Box,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { api } from './api/client';
import Header from './components/Header';
import OverviewView from './views/OverviewView';
import ProductsView from './views/ProductsView';
import RecommendationsView from './views/RecommendationsView';

export function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  // Core domain data
  const [health, setHealth] = useState(null);
  const [products, setProducts] = useState([]);
  const [pricingSuggestions, setPricingSuggestions] = useState([]);
  const [reorderSuggestions, setReorderSuggestions] = useState([]);

  // Fetch all domain data
  const loadData = useCallback(async (showLoadingSpinner = false) => {
    if (showLoadingSpinner) setLoading(true);
    try {
      const [healthRes, productsRes, pricingRes, reorderRes] = await Promise.all([
        api.getHealth().catch(() => ({ status: 'error' })),
        api.getProducts().catch(() => ({ data: [] })),
        api.getPricingSuggestions().catch(() => ({ data: [] })),
        api.getReorderSuggestions().catch(() => ({ data: [] })),
      ]);

      setHealth(healthRes);
      setProducts(productsRes.data || []);
      setPricingSuggestions(pricingRes.data || []);
      setReorderSuggestions(reorderRes.data || []);
    } catch (err) {
      console.error('Failed to load StockPulse data:', err);
    } finally {
      if (showLoadingSpinner) setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData(true);
  }, [loadData]);

  // Polling interval (every 5 seconds when autoRefresh is true)
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadData(false);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, loadData]);

  // Actions
  const handleSimulateSale = async (productId) => {
    try {
      const res = await api.simulateOrder(productId);
      notifications.show({
        title: 'Purchase Order Simulated',
        message: `Stock decremented to ${res.data.stockLevel} units (Demand velocity: ${res.data.demandVelocity}). Autonomous agentic loop evaluating signals.`,
        color: 'teal',
      });
      // Fast refresh
      setTimeout(() => loadData(false), 300);
    } catch (err) {
      notifications.show({
        title: 'Order Simulation Failed',
        message: err.message,
        color: 'red',
      });
    }
  };

  const handleUpdateStock = async (productId, stockLevel) => {
    try {
      const res = await api.updateStock(productId, stockLevel);
      notifications.show({
        title: 'Inventory Stock Updated',
        message: `Set on-hand stock for ${res.data.name} to ${res.data.stockLevel} units.`,
        color: 'teal',
      });
      setTimeout(() => loadData(false), 300);
    } catch (err) {
      notifications.show({
        title: 'Stock Update Failed',
        message: err.message,
        color: 'red',
      });
    }
  };

  const handleRequestPricing = async (productId) => {
    try {
      await api.suggestPricing(productId);
      notifications.show({
        title: 'Pricing Recommendation Generated',
        message: 'A new dynamic pricing suggestion has been created in PENDING status.',
        color: 'teal',
      });
      await loadData(false);
      setActiveTab('recommendations');
    } catch (err) {
      notifications.show({
        title: 'Pricing Advisor Error',
        message: err.message,
        color: 'red',
      });
    }
  };

  const handleRequestReorder = async (productId) => {
    try {
      await api.suggestReorder(productId);
      notifications.show({
        title: 'Reorder Recommendation Generated',
        message: 'A new replenishment suggestion has been created in PENDING status.',
        color: 'teal',
      });
      await loadData(false);
      setActiveTab('recommendations');
    } catch (err) {
      notifications.show({
        title: 'Reorder Advisor Error',
        message: err.message,
        color: 'red',
      });
    }
  };

  const handleAcceptPricing = async (id) => {
    try {
      const res = await api.acceptPricingSuggestion(id);
      notifications.show({
        title: 'Price Recommendation Accepted',
        message: `Product price updated to $${Number(res.product?.currentPrice || res.data?.recommendedPrice).toFixed(2)}.`,
        color: 'teal',
      });
      await loadData(false);
    } catch (err) {
      notifications.show({
        title: 'Acceptance Failed',
        message: err.message,
        color: 'red',
      });
    }
  };

  const handleRejectPricing = async (id) => {
    try {
      await api.rejectPricingSuggestion(id);
      notifications.show({
        title: 'Pricing Recommendation Rejected',
        message: 'Pricing suggestion marked as REJECTED.',
        color: 'gray',
      });
      await loadData(false);
    } catch (err) {
      notifications.show({
        title: 'Rejection Failed',
        message: err.message,
        color: 'red',
      });
    }
  };

  const handleAcceptReorder = async (id) => {
    try {
      const res = await api.acceptReorderSuggestion(id);
      notifications.show({
        title: 'Replenishment Order Accepted',
        message: `Inbound inventory delivered. Stock replenished to ${res.product?.stockLevel} units.`,
        color: 'teal',
      });
      await loadData(false);
    } catch (err) {
      notifications.show({
        title: 'Acceptance Failed',
        message: err.message,
        color: 'red',
      });
    }
  };

  const handleRejectReorder = async (id) => {
    try {
      await api.rejectReorderSuggestion(id);
      notifications.show({
        title: 'Reorder Recommendation Rejected',
        message: 'Replenishment suggestion marked as REJECTED.',
        color: 'gray',
      });
      await loadData(false);
    } catch (err) {
      notifications.show({
        title: 'Rejection Failed',
        message: err.message,
        color: 'red',
      });
    }
  };

  const pendingCount =
    pricingSuggestions.filter((s) => s.status === 'PENDING').length +
    reorderSuggestions.filter((s) => s.status === 'PENDING').length;

  return (
    <AppShell
      header={{ height: 56 }}
      padding="lg"
      styles={{
        main: {
          backgroundColor: '#f8fafc',
          minHeight: '100vh',
        },
      }}
    >
      <AppShell.Header>
        <Header
          health={health}
          autoRefresh={autoRefresh}
          setAutoRefresh={setAutoRefresh}
          onRefresh={() => loadData(true)}
          loading={loading}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          pendingCount={pendingCount}
        />
      </AppShell.Header>

      <AppShell.Main>
        <Container size="lg" style={{ maxWidth: '1240px' }} py="sm">
          <Box pos="relative">
            <LoadingOverlay visible={loading} zIndex={1000} overlayProps={{ radius: 'sm', blur: 1 }} />

            {activeTab === 'overview' && (
              <OverviewView
                products={products}
                pricingSuggestions={pricingSuggestions}
                reorderSuggestions={reorderSuggestions}
                onNavigateToProducts={() => setActiveTab('products')}
                onNavigateToRecommendations={() => setActiveTab('recommendations')}
                onSimulateSale={handleSimulateSale}
              />
            )}

            {activeTab === 'products' && (
              <ProductsView
                products={products}
                pricingSuggestions={pricingSuggestions}
                reorderSuggestions={reorderSuggestions}
                onSimulateSale={handleSimulateSale}
                onUpdateStock={handleUpdateStock}
                onRequestPricingSuggestion={handleRequestPricing}
                onRequestReorderSuggestion={handleRequestReorder}
                loading={loading}
              />
            )}

            {activeTab === 'recommendations' && (
              <RecommendationsView
                pricingSuggestions={pricingSuggestions}
                reorderSuggestions={reorderSuggestions}
                onAcceptPricing={handleAcceptPricing}
                onRejectPricing={handleRejectPricing}
                onAcceptReorder={handleAcceptReorder}
                onRejectReorder={handleRejectReorder}
              />
            )}
          </Box>
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
