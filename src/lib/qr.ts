import QRCode from "qrcode";

export async function generateQrDataUrl(
  text: string,
  size = 512,
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: size,
    margin: 2,
    color: {
      dark: "#0f1c18",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

export async function generateQrPngBuffer(text: string, size = 512): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    width: size,
    margin: 2,
    color: {
      dark: "#0f1c18",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
    type: "png",
  });
}
