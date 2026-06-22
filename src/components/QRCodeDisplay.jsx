import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from '../utils/translationService';

const QRCodeDisplay = ({ value, size = 200 }) => {
  const { t } = useTranslation();
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    QRCode.toDataURL(value, { width: size, margin: 1 })
      .then(url => setQrUrl(url))
      .catch(err => console.error(err));
  }, [value, size]);

  return qrUrl ? (
    <img
      src={qrUrl}
      alt="QR code"
      width={size}
      height={size}
      className="block"
      loading="lazy"
    />
  ) : (
    <div style={{ width: size, height: size }} className="flex items-center justify-center bg-slate-100 rounded-lg">
      <span className="text-[10px] text-slate-400 font-medium animate-pulse">{t('generating')}</span>
    </div>
  );
};

export default QRCodeDisplay;