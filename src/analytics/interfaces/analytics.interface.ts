export interface TransactionMetrics {
  totalTransactions: number;
  totalVolume: number;
  totalFees: number;
  averageTransactionValue: number;
  successRate: number;
  failureRate: number;
  chargebackRate: number;
  refundRate: number;
}

export interface MerchantMetrics {
  totalMerchants: number;
  activeMerchants: number;
  pendingMerchants: number;
  suspendedMerchants: number;
  kycApprovalRate: number;
  averageOnboardingTime: number;
}

export interface RevenueMetrics {
  totalRevenue: number;
  netRevenue: number;
  grossRevenue: number;
  revenueGrowth: number;
  monthlyRecurringRevenue: number;
  averageRevenuePerMerchant: number;
}

export interface FraudMetrics {
  totalFraudAttempts: number;
  fraudRate: number;
  blockedTransactions: number;
  falsePositiveRate: number;
  averageRiskScore: number;
}

export interface TimeSeriesData {
  timestamp: Date;
  value: number;
  label?: string;
}

export interface KpiData {
  name: string;
  value: number;
  previousValue?: number;
  change?: number;
  changePercentage?: number;
  trend: 'up' | 'down' | 'stable';
  target?: number;
  unit?: string;
  format?: 'currency' | 'percentage' | 'number';
}

export interface DashboardData {
  transactionMetrics: TransactionMetrics;
  merchantMetrics: MerchantMetrics;
  revenueMetrics: RevenueMetrics;
  fraudMetrics: FraudMetrics;
  kpis: KpiData[];
  timeSeries: {
    transactions: TimeSeriesData[];
    revenue: TimeSeriesData[];
    merchants: TimeSeriesData[];
  };
  topMerchants: {
    merchantId: string;
    businessName: string;
    volume: number;
    transactions: number;
    revenue: number;
  }[];
  recentActivity: {
    type: string;
    description: string;
    timestamp: Date;
    amount?: number;
    merchantId?: string;
  }[];
}

export interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  merchantIds?: string[];
  paymentMethods?: string[];
  currencies?: string[];
  statuses?: string[];
  countries?: string[];
  minAmount?: number;
  maxAmount?: number;
}

export interface ReportData {
  summary: {
    totalTransactions: number;
    totalVolume: number;
    totalFees: number;
    successRate: number;
  };
  breakdown: {
    byStatus: Record<string, number>;
    byPaymentMethod: Record<string, number>;
    byCurrency: Record<string, number>;
    byCountry: Record<string, number>;
    byMerchant: Record<string, { volume: number; count: number }>;
  };
  timeSeries: TimeSeriesData[];
  trends: {
    volumeTrend: number;
    transactionTrend: number;
    successRateTrend: number;
  };
}
