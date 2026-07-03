export default function TokenFlap({ value, size = 'lg' }) {
  const digits = String(value ?? '--').padStart(2, value == null ? '-' : '0').split('');
  const sizeClasses = size === 'lg' ? 'w-14 h-20 text-5xl' : 'w-9 h-12 text-2xl';

  return (
    <div className="flex gap-1.5">
      {digits.map((d, i) => (
        <div key={i} className={`flap-tile flex items-center justify-center font-mono font-bold text-token ${sizeClasses}`}>
          {d}
        </div>
      ))}
    </div>
  );
}
