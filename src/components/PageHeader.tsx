import React from 'react';

export const PageHeader = ({ title, subtitle, action }: { title: string, subtitle?: string, action?: React.ReactNode }) => (
  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
    <div>
      <h1 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h1>
      {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
    </div>
    {action && <div className="flex items-center gap-3">{action}</div>}
  </div>
);
