import React, { memo, useRef } from 'react';
import { X, Download, Printer } from 'lucide-react';
import QRCode from 'qrcode';
import { useEffect, useState } from 'react';
import type { InventoryItem } from '../../types';

interface QRCodeModalProps {
  item: InventoryItem;
  onClose: () => void;
}

const QRCodeModal = memo(({ item, onClose }: QRCodeModalProps) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const qrData = JSON.stringify({
          id: item.id,
          name: item.name,
          qr_code: item.qr_code,
          location: item.location
        });
        
        const url = await QRCode.toDataURL(qrData, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        
        setQrCodeUrl(url);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQRCode();
  }, [item]);

  const handleDownload = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.download = `qr-${item.name.replace(/\s+/g, '-').toLowerCase()}.png`;
      link.href = qrCodeUrl;
      link.click();
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow && qrCodeUrl) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code - ${item.name}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                text-align: center; 
                padding: 20px; 
              }
              .qr-container { 
                border: 2px solid #000; 
                padding: 20px; 
                display: inline-block; 
                margin: 20px;
              }
              .item-info { 
                margin-top: 10px; 
                font-size: 14px; 
              }
            </style>
          </head>
          <body>
            <div class="qr-container">
              <img src="${qrCodeUrl}" alt="QR Code" />
              <div class="item-info">
                <strong>${item.name}</strong><br/>
                QR: ${item.qr_code}<br/>
                Location: ${item.location}
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">QR Code</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="mb-4">
            <h3 className="text-lg font-medium text-gray-900 mb-2">{item.name}</h3>
            <p className="text-sm text-gray-600">QR Code: {item.qr_code}</p>
            <p className="text-sm text-gray-600">Location: {item.location}</p>
          </div>

          {qrCodeUrl && (
            <div className="mb-6">
              <img 
                src={qrCodeUrl} 
                alt="QR Code" 
                className="mx-auto border border-gray-200 rounded"
              />
            </div>
          )}

          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={handleDownload}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

QRCodeModal.displayName = 'QRCodeModal';

export default QRCodeModal;