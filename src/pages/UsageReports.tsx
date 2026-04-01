import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingDown, Calendar, ListFilter as Filter } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface UsageData {
  id: string;
  name: string;
  category: any;
  quantity: number;
  min_stock: number;
  usage: number;
  usage_percentage: string;
}

interface UsageEvent {
  id: number;
  item_name: string;
  quantity_changed: number;
  previous_quantity: number;
  new_quantity: number;
  user_name: string;
  user_email: string;
  timestamp: string;
}

export default function UsageReports() {
  const { t, i18n } = useTranslation();
  const [usageData, setUsageData] = useState<UsageData[]>([]);
  const [usageEvents, setUsageEvents] = useState<UsageEvent[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    start_date: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    category_id: ''
  });

  useEffect(() => {
    fetchCategories();
    fetchUsageData();
    fetchUsageEvents();
  }, []);

  useEffect(() => {
    fetchUsageData();
  }, [filters]);

  const fetchCategories = async () => {
    try {
      const data = await fetchApi('/api/categories');
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchUsageData = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.start_date) queryParams.append('start_date', filters.start_date);
      if (filters.end_date) queryParams.append('end_date', filters.end_date);
      if (filters.category_id) queryParams.append('category_id', filters.category_id);

      const data = await fetchApi(`/api/reports/usage?${queryParams.toString()}`);
      setUsageData(data || []);
    } catch (error) {
      console.error('Error fetching usage data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsageEvents = async () => {
    try {
      const data = await fetchApi('/api/reports/usage-events');
      setUsageEvents(data || []);
    } catch (error) {
      console.error('Error fetching usage events:', error);
    }
  };

  const getCategoryName = (category: any) => {
    if (!category) return t('uncategorized');
    return i18n.language === 'fr' ? category.name_fr : category.name_en;
  };

  const getUsageColor = (usage: number) => {
    if (usage >= 50) return 'text-red-600 font-semibold';
    if (usage >= 20) return 'text-yellow-600 font-semibold';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#001f3f]">{t('usage_reports')}</h1>
          <p className="text-gray-600 mt-1">{t('track_part_usage_over_time')}</p>
        </div>
        <TrendingDown className="w-12 h-12 text-[#001f3f]" />
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-800">{t('filters')}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              {t('start_date')}
            </label>
            <input
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f3f] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Calendar className="w-4 h-4 inline mr-1" />
              {t('end_date')}
            </label>
            <input
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f3f] focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('category')}
            </label>
            <select
              value={filters.category_id}
              onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#001f3f] focus:border-transparent"
            >
              <option value="">{t('all_categories')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {i18n.language === 'fr' ? category.name_fr : category.name_en}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('item_name')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('category')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('current_stock')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('usage')}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                {t('usage_rate')}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {usageData.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {item.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {getCategoryName(item.category)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {item.quantity}
                  {item.quantity <= item.min_stock && (
                    <span className="ml-2 text-xs text-red-600">({t('low_stock')})</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={getUsageColor(item.usage)}>
                    {item.usage} {t('units')}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={getUsageColor(parseFloat(item.usage_percentage))}>
                    {item.usage_percentage}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {usageData.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {t('no_usage_data_found')}
          </div>
        )}
      </div>

      {usageData.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">{t('insights')}</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>Total items tracked: {usageData.length}</li>
            <li>Highest usage: {usageData[0]?.name} ({usageData[0]?.usage} {t('units')})</li>
            <li>
              Items below minimum stock: {usageData.filter(item => item.quantity <= item.min_stock).length}
            </li>
          </ul>
        </div>
      )}

      {/* Recent Usage History Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('recent_usage_history') || 'Recent Usage History'}</h2>
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('item_name')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('quantity_changed') || 'Quantity Changed'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('previous_stock') || 'Previous Stock'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('new_stock') || 'New Stock'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('user') || 'User'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('timestamp')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {usageEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {event.item_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-bold">
                    -{event.quantity_changed}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {event.previous_quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {event.new_quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {event.user_name || event.user_email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(event.timestamp).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {usageEvents.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {t('no_usage_events_found') || 'No recent usage events found.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
