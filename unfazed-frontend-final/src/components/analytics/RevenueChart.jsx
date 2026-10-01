import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function RevenueChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Revenue']} />
        <Area type="monotone" dataKey="revenue" stroke="#1677ff" fill="#dcecff" strokeWidth={3} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
