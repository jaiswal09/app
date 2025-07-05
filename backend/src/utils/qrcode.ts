import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

export const generateQRCode = async (data: string): Promise<string> => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(data, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Failed to generate QR code');
  }
};

export const generateQRCodeText = (): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = uuidv4().slice(0, 8);
  return `MED-${timestamp}-${randomStr}`.toUpperCase();
};

export const generateUniqueQRCode = async (existingCodes: string[]): Promise<string> => {
  let qrCode: string;
  let attempts = 0;
  
  do {
    qrCode = generateQRCodeText();
    attempts++;
    
    if (attempts > 50) {
      throw new Error('Unable to generate unique QR code after 50 attempts');
    }
  } while (existingCodes.includes(qrCode));
  
  return qrCode;
};