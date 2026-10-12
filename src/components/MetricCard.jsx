export default function MetricCard({ metric, index }) {
  return (
    <li className={`metric-card metric-card-${index + 1}`}>
      <p className="metric-value">{metric.value}<span className="metric-percent">%</span></p>
      <p className="metric-description">{metric.description}</p>
    </li>
  );
}
