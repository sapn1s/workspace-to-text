import React from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

export const ExplorerHeader = ({ onRefresh, isRefreshing }) => (
  <div className="flex items-center justify-between mb-4 flex-shrink-0">
    <h3 className="text-lg font-medium text-gray-200">Project Explorer</h3>
    <button
      onClick={onRefresh}
      className="p-1.5 hover:bg-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      disabled={isRefreshing}
    >
      <ArrowPathIcon className={`w-5 h-5 text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
    </button>
  </div>
);